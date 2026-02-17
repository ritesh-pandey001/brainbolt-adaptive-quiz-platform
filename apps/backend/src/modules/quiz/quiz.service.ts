import prisma from '../../lib/prisma';
import logger from '../../lib/logger';
import adaptiveDifficultyService from '../../services/adaptive-difficulty.service';
import cacheService from '../../services/cache.service';
import leaderboardService from '../leaderboard/leaderboard.service';
import {
  NextQuestionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  MetricsResponse,
} from '@brainbolt/shared';
import { UserState } from '@prisma/client';

export class QuizService {
  /**
   * Get next question for user based on current difficulty.
   * Selects unanswered questions first, falls back to nearest difficulties.
   */
  async getNextQuestion(userId: string): Promise<NextQuestionResponse> {
    let userState = await cacheService.getUserState<UserState>(userId);

    if (!userState) {
      userState = await prisma.userState.findUnique({
        where: { userId },
      });

      if (!userState) {
        userState = await prisma.userState.create({
          data: {
            userId,
            currentDifficulty: 1,
            streak: 0,
            maxStreak: 0,
            totalScore: 0,
            totalAnswered: 0,
            correctAnswers: 0,
            confidenceBuffer: [],
            lastActivityAt: new Date(),
            stateVersion: 0,
          },
        });
      }

      await cacheService.setUserState(userId, userState);
    }

    // Check for inactivity and reset if needed
    if (adaptiveDifficultyService.isStateStale(userState.lastActivityAt)) {
      const freshState = adaptiveDifficultyService.getFreshStateAfterInactivity(userState);
      userState = await prisma.userState.update({
        where: { userId },
        data: {
          ...freshState,
          stateVersion: { increment: 1 },
        },
      });
      await cacheService.setUserState(userId, userState);
    }

    const difficulty = userState.currentDifficulty;

    // Get ALL answered question IDs to prevent repetition
    const answeredLogs = await prisma.answerLog.findMany({
      where: { userId },
      select: { questionId: true },
    });
    const answeredQuestionIds = new Set(answeredLogs.map((a: { questionId: string }) => a.questionId));

    // Try unanswered questions at current difficulty
    let questions = await prisma.question.findMany({
      where: {
        difficulty,
        deletedAt: null,
        id: answeredQuestionIds.size > 0 ? { notIn: Array.from(answeredQuestionIds) } : undefined,
      },
    });

    // Fallback: search nearest difficulties
    if (questions.length === 0) {
      for (let delta = 1; delta <= 10; delta++) {
        const candidates: typeof questions = [];
        for (const d of [difficulty + delta, difficulty - delta]) {
          if (d >= 1 && d <= 10) {
            const found = await prisma.question.findMany({
              where: {
                difficulty: d,
                deletedAt: null,
                id: answeredQuestionIds.size > 0 ? { notIn: Array.from(answeredQuestionIds) } : undefined,
              },
            });
            candidates.push(...found);
          }
        }
        if (candidates.length > 0) {
          questions = candidates;
          break;
        }
      }
    }

    // Ultimate fallback: re-use questions at current difficulty
    if (questions.length === 0) {
      questions = await prisma.question.findMany({
        where: { difficulty, deletedAt: null },
      });
    }

    if (!questions || questions.length === 0) {
      throw new Error(`No questions available for difficulty ${difficulty}`);
    }

    const selectedQuestion = questions[Math.floor(Math.random() * questions.length)];
    const { correctAnswer, ...questionWithoutAnswer } = selectedQuestion;

    return {
      question: {
        ...questionWithoutAnswer,
        category: questionWithoutAnswer.category ?? undefined,
        createdAt: new Date(questionWithoutAnswer.createdAt),
      },
      currentDifficulty: userState.currentDifficulty,
      streak: userState.streak,
      totalScore: userState.totalScore,
      stateVersion: userState.stateVersion,
    };
  }

  /**
   * Submit answer with idempotency, optimistic locking, and transaction atomicity.
   */
  async submitAnswer(request: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
    const { userId, questionId, selectedAnswer, answerIdempotencyKey, stateVersion } = request;

    // Check idempotency (outside transaction for performance)
    const existingAnswer = await prisma.answerLog.findUnique({
      where: { idempotencyKey: answerIdempotencyKey },
    });

    if (existingAnswer) {
      logger.info(`Duplicate submission detected: ${answerIdempotencyKey}`);
      const userState = await prisma.userState.findUnique({ where: { userId } });
      if (!userState) throw new Error('User state not found');
      const question = await prisma.question.findUnique({ where: { id: questionId } });
      const userRank = await leaderboardService.getUserScoreRank(userId);

      return {
        isCorrect: existingAnswer.isCorrect,
        correctAnswer: question?.correctAnswer ?? 0,
        scoreDelta: existingAnswer.scoreDelta,
        newScore: userState.totalScore,
        newStreak: userState.streak,
        newDifficulty: userState.currentDifficulty,
        userRank: userRank ?? undefined,
        stateVersion: userState.stateVersion,
      };
    }

    // Check duplicate question answer (no double points)
    const previousAnswer = await prisma.answerLog.findFirst({
      where: { userId, questionId },
    });

    if (previousAnswer) {
      logger.info(`Question already answered: user=${userId}, question=${questionId}`);
      const userState = await prisma.userState.findUnique({ where: { userId } });
      if (!userState) throw new Error('User state not found');
      const question = await prisma.question.findUnique({ where: { id: questionId } });
      const userRank = await leaderboardService.getUserScoreRank(userId);

      return {
        isCorrect: previousAnswer.isCorrect,
        correctAnswer: question?.correctAnswer ?? 0,
        scoreDelta: 0,
        newScore: userState.totalScore,
        newStreak: userState.streak,
        newDifficulty: userState.currentDifficulty,
        userRank: userRank ?? undefined,
        stateVersion: userState.stateVersion,
      };
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new Error('Question not found');

    const isCorrect = selectedAnswer === question.correctAnswer;

    // Atomic transaction for all state changes
    const result = await this.executeAnswerTransaction(userId, questionId, selectedAnswer, isCorrect, stateVersion, answerIdempotencyKey);

    // Update leaderboards (eventual consistency)
    try {
      await leaderboardService.updateScore(userId, result.updatedState.totalScore);
      await leaderboardService.updateStreak(userId, result.newStreak);
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to update leaderboards, will sync later');
    }

    // Invalidate cache
    try {
      await cacheService.invalidateUserState(userId);
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to invalidate cache');
    }

    let userRank: number | undefined;
    try {
      userRank = (await leaderboardService.getUserScoreRank(userId)) ?? undefined;
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to get user rank');
    }

    logger.info(
      `Answer submitted: user=${userId}, correct=${isCorrect}, score=${result.scoreDelta}, newDifficulty=${result.difficultyResult.newDifficulty}, newStreak=${result.newStreak}`
    );

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      scoreDelta: result.scoreDelta,
      newScore: result.updatedState.totalScore,
      newStreak: result.newStreak,
      newDifficulty: result.difficultyResult.newDifficulty,
      userRank,
      stateVersion: result.updatedState.stateVersion,
    };
  }

  /**
   * Execute the answer submission in an atomic Prisma transaction.
   */
  private async executeAnswerTransaction(
    userId: string,
    questionId: string,
    selectedAnswer: number,
    isCorrect: boolean,
    stateVersion: number,
    answerIdempotencyKey: string
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const currentState = await tx.userState.findUnique({ where: { userId } });
        if (!currentState) throw new Error('User state not found');

        // Optimistic locking
        if (currentState.stateVersion !== stateVersion) {
          throw new Error(
            `State version mismatch. Expected ${stateVersion}, got ${currentState.stateVersion}. Please retry.`
          );
        }

        // Apply inactivity decay
        const now = new Date();
        const minutesSinceLastActivity =
          (now.getTime() - currentState.lastActivityAt.getTime()) / (1000 * 60);

        let effectiveStreak = currentState.streak;
        let effectiveConfidenceBuffer = currentState.confidenceBuffer;

        if (minutesSinceLastActivity > adaptiveDifficultyService['inactivityDecayMinutes']) {
          effectiveStreak = Math.floor(currentState.streak / 2);
          effectiveConfidenceBuffer = [];
          logger.info(
            `Inactivity decay applied: user=${userId}, oldStreak=${currentState.streak}, newStreak=${effectiveStreak}`
          );
        }

        const difficultyResult = adaptiveDifficultyService.calculateNewDifficulty(
          currentState.currentDifficulty,
          isCorrect,
          effectiveConfidenceBuffer
        );

        const newStreak = isCorrect ? effectiveStreak + 1 : 0;

        const scoreDelta = adaptiveDifficultyService.calculateScoreDelta(
          currentState.currentDifficulty,
          newStreak,
          isCorrect
        );

        const updatedState = await tx.userState.update({
          where: { userId, stateVersion: currentState.stateVersion },
          data: {
            currentDifficulty: difficultyResult.newDifficulty,
            streak: newStreak,
            maxStreak: Math.max(currentState.maxStreak, newStreak),
            totalScore: currentState.totalScore + scoreDelta,
            totalAnswered: currentState.totalAnswered + 1,
            correctAnswers: currentState.correctAnswers + (isCorrect ? 1 : 0),
            confidenceBuffer: difficultyResult.newConfidenceBuffer,
            lastActivityAt: now,
            stateVersion: { increment: 1 },
          },
        });

        await tx.answerLog.create({
          data: {
            userId,
            questionId,
            selectedAnswer,
            isCorrect,
            difficultyAttempted: currentState.currentDifficulty,
            scoreDelta,
            streakAtAnswer: effectiveStreak,
            idempotencyKey: answerIdempotencyKey,
          },
        });

        return { updatedState, scoreDelta, newStreak, difficultyResult };
      });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === 'P2025' || err.message.includes('Record to update not found')) {
        throw new Error('Optimistic locking conflict. Another request modified the state. Please retry.');
      }
      throw error;
    }
  }

  /**
   * Get user performance metrics.
   */
  async getMetrics(userId: string): Promise<MetricsResponse> {
    const userState = await prisma.userState.findUnique({ where: { userId } });
    if (!userState) throw new Error('User state not found');

    const answerLogs = await prisma.answerLog.findMany({
      where: { userId },
      select: { difficultyAttempted: true },
    });

    const difficultyMap = new Map<number, number>();
    for (const log of answerLogs) {
      difficultyMap.set(log.difficultyAttempted, (difficultyMap.get(log.difficultyAttempted) || 0) + 1);
    }

    const difficultyHistogram = Array.from(difficultyMap.entries())
      .map(([difficulty, count]) => ({ difficulty, count }))
      .sort((a, b) => a.difficulty - b.difficulty);

    const recentAnswers = await prisma.answerLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        questionId: true,
        isCorrect: true,
        difficultyAttempted: true,
        scoreDelta: true,
        createdAt: true,
      },
    });

    const recentPerformance = recentAnswers.map((answer) => ({
      questionId: answer.questionId,
      isCorrect: answer.isCorrect,
      difficulty: answer.difficultyAttempted,
      scoreDelta: answer.scoreDelta,
      createdAt: answer.createdAt,
    }));

    const accuracy =
      userState.totalAnswered > 0 ? userState.correctAnswers / userState.totalAnswered : 0;

    return {
      userId,
      totalScore: userState.totalScore,
      currentStreak: userState.streak,
      maxStreak: userState.maxStreak,
      totalAnswered: userState.totalAnswered,
      correctAnswers: userState.correctAnswers,
      accuracy,
      currentDifficulty: userState.currentDifficulty,
      difficultyHistogram,
      recentPerformance,
    };
  }
}

export default new QuizService();
