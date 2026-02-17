import redisClient from '../../lib/redis';
import { config } from '../../config';
import logger from '../../lib/logger';
import prisma from '../../lib/prisma';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

export class LeaderboardService {
  private readonly redis = redisClient.getClient();
  private readonly scoreKey = 'leaderboard:score';
  private readonly streakKey = 'leaderboard:streak';
  private readonly topN: number;

  constructor() {
    this.topN = config.LEADERBOARD_TOP_N;
  }

  async updateScore(userId: string, score: number): Promise<void> {
    if (!redisClient.isReady()) {
      logger.warn('Redis not ready, skipping leaderboard update');
      return;
    }

    try {
      await this.redis.zadd(this.scoreKey, score, userId);
      logger.debug(`Updated score leaderboard: ${userId} = ${score}`);
    } catch (error) {
      logger.error('Error updating score leaderboard:', error);
    }
  }

  async updateStreak(userId: string, streak: number): Promise<void> {
    if (!redisClient.isReady()) {
      logger.warn('Redis not ready, skipping leaderboard update');
      return;
    }

    try {
      await this.redis.zadd(this.streakKey, streak, userId);
      logger.debug(`Updated streak leaderboard: ${userId} = ${streak}`);
    } catch (error) {
      logger.error('Error updating streak leaderboard:', error);
    }
  }

  async getUserScoreRank(userId: string): Promise<number | null> {
    if (!redisClient.isReady()) return null;

    try {
      const rank = await this.redis.zrevrank(this.scoreKey, userId);
      return rank !== null ? rank + 1 : null;
    } catch (error) {
      logger.error('Error getting user score rank:', error);
      return null;
    }
  }

  async getUserStreakRank(userId: string): Promise<number | null> {
    if (!redisClient.isReady()) return null;

    try {
      const rank = await this.redis.zrevrank(this.streakKey, userId);
      return rank !== null ? rank + 1 : null;
    } catch (error) {
      logger.error('Error getting user streak rank:', error);
      return null;
    }
  }

  async getTopScores(limit: number = this.topN): Promise<LeaderboardEntry[]> {
    if (!redisClient.isReady()) {
      logger.warn('Redis not ready, falling back to DB for leaderboard');
      return this.getTopScoresFromDB(limit);
    }

    try {
      const results = await this.redis.zrevrange(this.scoreKey, 0, limit - 1, 'WITHSCORES');
      const entries: LeaderboardEntry[] = [];

      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const score = parseInt(results[i + 1], 10);
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });

        if (user) {
          entries.push({ userId, username: user.username, score, rank: Math.floor(i / 2) + 1 });
        }
      }

      return entries;
    } catch (error) {
      logger.error('Error getting top scores:', error);
      return this.getTopScoresFromDB(limit);
    }
  }

  async getTopStreaks(limit: number = this.topN): Promise<LeaderboardEntry[]> {
    if (!redisClient.isReady()) {
      logger.warn('Redis not ready, falling back to DB for leaderboard');
      return this.getTopStreaksFromDB(limit);
    }

    try {
      const results = await this.redis.zrevrange(this.streakKey, 0, limit - 1, 'WITHSCORES');
      const entries: LeaderboardEntry[] = [];

      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const score = parseInt(results[i + 1], 10);
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });

        if (user) {
          entries.push({ userId, username: user.username, score, rank: Math.floor(i / 2) + 1 });
        }
      }

      return entries;
    } catch (error) {
      logger.error('Error getting top streaks:', error);
      return this.getTopStreaksFromDB(limit);
    }
  }

  private async getTopScoresFromDB(limit: number): Promise<LeaderboardEntry[]> {
    const results = await prisma.userState.findMany({
      take: limit,
      orderBy: { totalScore: 'desc' },
      include: { user: { select: { username: true } } },
    });

    return results.map((result, index) => ({
      userId: result.userId,
      username: result.user.username,
      score: result.totalScore,
      rank: index + 1,
    }));
  }

  private async getTopStreaksFromDB(limit: number): Promise<LeaderboardEntry[]> {
    const results = await prisma.userState.findMany({
      take: limit,
      orderBy: { streak: 'desc' },
      include: { user: { select: { username: true } } },
    });

    return results.map((result, index) => ({
      userId: result.userId,
      username: result.user.username,
      score: result.streak,
      rank: index + 1,
    }));
  }

  async initializeFromDB(): Promise<void> {
    if (!redisClient.isReady()) {
      logger.warn('Redis not ready, skipping leaderboard initialization');
      return;
    }

    try {
      const userStates = await prisma.userState.findMany({
        select: { userId: true, totalScore: true, streak: true },
      });

      const pipeline = this.redis.pipeline();
      for (const state of userStates) {
        pipeline.zadd(this.scoreKey, state.totalScore, state.userId);
        pipeline.zadd(this.streakKey, state.streak, state.userId);
      }

      await pipeline.exec();
      logger.info('Leaderboard initialized from database');
    } catch (error) {
      logger.error('Error initializing leaderboard:', error);
    }
  }
}

export default new LeaderboardService();
