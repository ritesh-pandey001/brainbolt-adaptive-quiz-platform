import prisma from '../../lib/prisma';
import logger from '../../lib/logger';
import adaptiveDifficultyService from '../../services/adaptive-difficulty.service';
import cacheService from '../../services/cache.service';
import leaderboardService from '../leaderboard/leaderboard.service';
import {
  SessionStateResponse,
  SessionAnswerResponse,
  SessionSummaryResponse,
  SessionAnswerRequest,
} from '@brainbolt/shared';

export class SessionService {
  /**
   * Start a new quiz session for a user.
   * Generates a fixed pool of N questions using adaptive difficulty seeding.
   */
  async startSession(userId: string, totalQuestions: number = 30): Promise<SessionStateResponse> {
    let userState = await prisma.userState.findUnique({ where: { userId } });
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

    // Close any existing incomplete sessions
    await prisma.quizSession.updateMany({
      where: { userId, completedAt: null },
      data: { completedAt: new Date() },
    });

    // Build question pool adaptively
    const allQuestions = await prisma.question.findMany({
      where: { deletedAt: null },
      orderBy: { difficulty: 'asc' },
    });

    const answeredLogs = await prisma.answerLog.findMany({
      where: { userId },
      select: { questionId: true },
    });
    const answeredIds = new Set(answeredLogs.map((a) => a.questionId));

    // Group by difficulty
    const byDifficulty = new Map<number, typeof allQuestions>();
    for (const q of allQuestions) {
      const arr = byDifficulty.get(q.difficulty) || [];
      arr.push(q);
      byDifficulty.set(q.difficulty, arr);
    }

    const pool: typeof allQuestions = [];
    const usedIds = new Set<string>();
    const difficultySpread = this.buildDifficultySpread(userState.currentDifficulty, totalQuestions);

    for (const targetDiff of difficultySpread) {
      const candidates = (byDifficulty.get(targetDiff) || [])
        .filter((q) => !usedIds.has(q.id))
        .sort((a, b) => {
          const aAnswered = answeredIds.has(a.id) ? 1 : 0;
          const bAnswered = answeredIds.has(b.id) ? 1 : 0;
          if (aAnswered !== bAnswered) return aAnswered - bAnswered;
          return Math.random() - 0.5;
        });

      if (candidates.length > 0) {
        pool.push(candidates[0]);
        usedIds.add(candidates[0].id);
      }

      if (pool.length >= totalQuestions) break;
    }

    // Fill remaining from any difficulty
    if (pool.length < totalQuestions) {
      const remaining = allQuestions
        .filter((q) => !usedIds.has(q.id))
        .sort(() => Math.random() - 0.5);

      for (const q of remaining) {
        pool.push(q);
        usedIds.add(q.id);
        if (pool.length >= totalQuestions) break;
      }
    }

    const session = await prisma.$transaction(async (tx) => {
      const sess = await tx.quizSession.create({
        data: { userId, totalQuestions: pool.length, currentIndex: 0 },
      });

      await tx.quizSessionQuestion.createMany({
        data: pool.map((q, idx) => ({
          sessionId: sess.id,
          questionId: q.id,
          orderIndex: idx,
          status: 'pending',
          isFlagged: false,
          scoreDelta: 0,
        })),
      });

      return sess;
    });

    logger.info(`Session created: ${session.id} with ${pool.length} questions for user ${userId}`);
    return this.getSessionState(userId, session.id);
  }

  /**
   * Get full session state (for restoration on refresh).
   */
  async getSessionState(userId: string, sessionId?: string): Promise<SessionStateResponse> {
    let session;
    if (sessionId) {
      session = await prisma.quizSession.findFirst({ where: { id: sessionId, userId } });
    } else {
      session = await prisma.quizSession.findFirst({
        where: { userId, completedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!session) throw new Error('NO_ACTIVE_SESSION');

    const sessionQuestions = await prisma.quizSessionQuestion.findMany({
      where: { sessionId: session.id },
      include: {
        question: {
          select: { id: true, text: true, options: true, difficulty: true, category: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    const userState = await prisma.userState.findUnique({ where: { userId } });
    if (!userState) throw new Error('User state not found');

    const stats = {
      total: sessionQuestions.length,
      attempted: sessionQuestions.filter((q) => q.status !== 'pending').length,
      unattempted: sessionQuestions.filter((q) => q.status === 'pending').length,
      correct: sessionQuestions.filter((q) => q.status === 'correct').length,
      wrong: sessionQuestions.filter((q) => q.status === 'wrong').length,
      flagged: sessionQuestions.filter((q) => q.isFlagged).length,
    };

    const currentQuestion = sessionQuestions[session.currentIndex];
    if (!currentQuestion) throw new Error('Invalid session state');

    let userRank: number | undefined;
    try {
      userRank = (await leaderboardService.getUserScoreRank(userId)) ?? undefined;
    } catch { /* ignore */ }

    const mappedQuestions = sessionQuestions.map((sq) => ({
      id: sq.id,
      sessionId: sq.sessionId,
      questionId: sq.questionId,
      orderIndex: sq.orderIndex,
      status: sq.status as 'pending' | 'correct' | 'wrong',
      isFlagged: sq.isFlagged,
      scoreDelta: sq.scoreDelta,
      selectedAnswer: sq.selectedAnswer,
      answeredAt: sq.answeredAt?.toISOString() ?? null,
      question: {
        id: sq.question.id,
        text: sq.question.text,
        options: sq.question.options,
        difficulty: sq.question.difficulty,
        category: sq.question.category,
      },
    }));

    return {
      session: {
        id: session.id,
        userId: session.userId,
        totalQuestions: session.totalQuestions,
        currentIndex: session.currentIndex,
        createdAt: session.createdAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
      },
      questions: mappedQuestions,
      currentQuestion: mappedQuestions[session.currentIndex],
      score: userState.totalScore,
      streak: userState.streak,
      difficulty: userState.currentDifficulty,
      stateVersion: userState.stateVersion,
      userRank,
      stats,
    };
  }

  /**
   * Submit an answer within a session.
   * Enforces: no duplicate scoring, idempotency, optimistic locking.
   */
  async submitAnswer(request: SessionAnswerRequest): Promise<SessionAnswerResponse> {
    const { userId, sessionId, questionId, selectedAnswer, answerIdempotencyKey, stateVersion } = request;

    const session = await prisma.quizSession.findFirst({
      where: { id: sessionId, userId, completedAt: null },
    });
    if (!session) throw new Error('Session not found or already completed');

    const sessionQuestion = await prisma.quizSessionQuestion.findFirst({
      where: { sessionId, questionId },
    });
    if (!sessionQuestion) throw new Error('Question not in this session');

    // Idempotency check
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
        questionStatus: existingAnswer.isCorrect ? 'correct' : 'wrong',
      };
    }

    // Already answered in session (no double scoring)
    if (sessionQuestion.status !== 'pending') {
      logger.info(`Question already answered in session: session=${sessionId}, question=${questionId}`);
      const userState = await prisma.userState.findUnique({ where: { userId } });
      if (!userState) throw new Error('User state not found');
      const question = await prisma.question.findUnique({ where: { id: questionId } });
      const userRank = await leaderboardService.getUserScoreRank(userId);
      return {
        isCorrect: sessionQuestion.status === 'correct',
        correctAnswer: question?.correctAnswer ?? 0,
        scoreDelta: 0,
        newScore: userState.totalScore,
        newStreak: userState.streak,
        newDifficulty: userState.currentDifficulty,
        userRank: userRank ?? undefined,
        stateVersion: userState.stateVersion,
        questionStatus: sessionQuestion.status as 'correct' | 'wrong',
      };
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new Error('Question not found');

    const isCorrect = selectedAnswer === question.correctAnswer;

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const currentState = await tx.userState.findUnique({ where: { userId } });
      if (!currentState) throw new Error('User state not found');

      if (currentState.stateVersion !== stateVersion) {
        throw new Error(
          `State version mismatch. Expected ${stateVersion}, got ${currentState.stateVersion}. Please retry.`
        );
      }

      const now = new Date();
      const minutesSinceLastActivity =
        (now.getTime() - currentState.lastActivityAt.getTime()) / (1000 * 60);

      let effectiveStreak = currentState.streak;
      let effectiveConfidenceBuffer = currentState.confidenceBuffer;

      if (minutesSinceLastActivity > 30) {
        effectiveStreak = Math.floor(currentState.streak / 2);
        effectiveConfidenceBuffer = [];
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

      await tx.quizSessionQuestion.update({
        where: { id: sessionQuestion.id },
        data: {
          status: isCorrect ? 'correct' : 'wrong',
          scoreDelta,
          selectedAnswer,
          answeredAt: now,
        },
      });

      // Auto-advance to next unanswered question
      const allSessionQuestions = await tx.quizSessionQuestion.findMany({
        where: { sessionId },
        orderBy: { orderIndex: 'asc' },
      });

      let nextIndex = session.currentIndex;
      for (let i = session.currentIndex + 1; i < allSessionQuestions.length; i++) {
        if (allSessionQuestions[i].status === 'pending') {
          nextIndex = i;
          break;
        }
      }
      if (nextIndex === session.currentIndex) {
        for (let i = 0; i < session.currentIndex; i++) {
          if (allSessionQuestions[i].status === 'pending') {
            nextIndex = i;
            break;
          }
        }
      }

      await tx.quizSession.update({
        where: { id: sessionId },
        data: { currentIndex: nextIndex },
      });

      return { updatedState, scoreDelta, newStreak, difficultyResult, isCorrect };
    });

    // Update leaderboards (eventual consistency)
    try {
      await leaderboardService.updateScore(userId, result.updatedState.totalScore);
      await leaderboardService.updateStreak(userId, result.newStreak);
    } catch (error) {
      logger.error({ err: error }, 'Failed to update leaderboards');
    }

    try {
      await cacheService.invalidateUserState(userId);
    } catch (error) {
      logger.error({ err: error }, 'Failed to invalidate cache');
    }

    let userRank: number | undefined;
    try {
      userRank = (await leaderboardService.getUserScoreRank(userId)) ?? undefined;
    } catch { /* ignore */ }

    return {
      isCorrect: result.isCorrect,
      correctAnswer: question.correctAnswer,
      scoreDelta: result.scoreDelta,
      newScore: result.updatedState.totalScore,
      newStreak: result.newStreak,
      newDifficulty: result.difficultyResult.newDifficulty,
      userRank,
      stateVersion: result.updatedState.stateVersion,
      questionStatus: result.isCorrect ? 'correct' : 'wrong',
    };
  }

  /**
   * Navigate to a specific question in the session.
   */
  async navigate(userId: string, sessionId: string, targetIndex: number): Promise<SessionStateResponse> {
    const session = await prisma.quizSession.findFirst({
      where: { id: sessionId, userId, completedAt: null },
    });
    if (!session) throw new Error('Session not found or already completed');

    if (targetIndex < 0 || targetIndex >= session.totalQuestions) {
      throw new Error('Invalid question index');
    }

    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { currentIndex: targetIndex },
    });

    return this.getSessionState(userId, sessionId);
  }

  /**
   * Toggle flag on a question.
   */
  async toggleFlag(userId: string, sessionId: string, questionId: string): Promise<{ isFlagged: boolean }> {
    const session = await prisma.quizSession.findFirst({
      where: { id: sessionId, userId, completedAt: null },
    });
    if (!session) throw new Error('Session not found or already completed');

    const sq = await prisma.quizSessionQuestion.findFirst({
      where: { sessionId, questionId },
    });
    if (!sq) throw new Error('Question not in session');

    const updated = await prisma.quizSessionQuestion.update({
      where: { id: sq.id },
      data: { isFlagged: !sq.isFlagged },
    });

    return { isFlagged: updated.isFlagged };
  }

  /**
   * Finish the exam session.
   */
  async finishSession(userId: string, sessionId: string): Promise<SessionSummaryResponse> {
    const session = await prisma.quizSession.findFirst({
      where: { id: sessionId, userId, completedAt: null },
    });
    if (!session) throw new Error('Session not found or already completed');

    const now = new Date();
    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { completedAt: now },
    });

    const questions = await prisma.quizSessionQuestion.findMany({
      where: { sessionId },
    });

    const userState = await prisma.userState.findUnique({ where: { userId } });

    const correct = questions.filter((q) => q.status === 'correct').length;
    const wrong = questions.filter((q) => q.status === 'wrong').length;
    const attempted = correct + wrong;

    return {
      sessionId,
      totalQuestions: session.totalQuestions,
      attempted,
      correct,
      wrong,
      totalScore: userState?.totalScore ?? 0,
      maxStreak: userState?.maxStreak ?? 0,
      accuracy: attempted > 0 ? correct / attempted : 0,
      completedAt: now.toISOString(),
    };
  }

  /**
   * Build difficulty spread for session pool generation.
   * 60% near current (±1), 30% medium range (±2-3), 10% random variety.
   */
  private buildDifficultySpread(startDifficulty: number, total: number): number[] {
    const spread: number[] = [];
    const clamp = (v: number) => Math.max(1, Math.min(10, v));

    const nearCount = Math.floor(total * 0.6);
    for (let i = 0; i < nearCount; i++) {
      const offset = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : -1;
      spread.push(clamp(startDifficulty + offset));
    }

    const midCount = Math.floor(total * 0.3);
    for (let i = 0; i < midCount; i++) {
      const offset = i % 2 === 0 ? 2 + (i % 2) : -(2 + (i % 2));
      spread.push(clamp(startDifficulty + offset));
    }

    const farCount = total - nearCount - midCount;
    for (let i = 0; i < farCount; i++) {
      spread.push(Math.floor(Math.random() * 10) + 1);
    }

    return spread;
  }
}

export default new SessionService();
