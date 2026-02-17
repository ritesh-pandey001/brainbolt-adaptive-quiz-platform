import redisClient from '../lib/redis';
import { config } from '../config';
import logger from '../lib/logger';

export class CacheService {
  private readonly ttl: number;
  private readonly redis = redisClient.getClient();

  constructor() {
    this.ttl = config.CACHE_TTL_SECONDS;
  }

  /**
   * Generate cache key for user state
   */
  private getUserStateKey(userId: string): string {
    return `user:state:${userId}`;
  }

  /**
   * Generate cache key for question pool by difficulty
   */
  private getQuestionPoolKey(difficulty: number): string {
    return `questions:difficulty:${difficulty}`;
  }

  /**
   * Get user state from cache
   */
  async getUserState<T = Record<string, unknown>>(userId: string): Promise<T | null> {
    if (!redisClient.isReady()) {
      logger.warn('Redis not ready, skipping cache get');
      return null;
    }

    try {
      const key = this.getUserStateKey(userId);
      const data = await this.redis.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data);
      // Convert date strings back to Date objects
      if (parsed.lastActivityAt) {
        parsed.lastActivityAt = new Date(parsed.lastActivityAt);
      }
      if (parsed.createdAt) {
        parsed.createdAt = new Date(parsed.createdAt);
      }
      if (parsed.updatedAt) {
        parsed.updatedAt = new Date(parsed.updatedAt);
      }

      return parsed;
    } catch (error) {
      logger.error('Error getting user state from cache:', error);
      return null;
    }
  }

  /**
   * Set user state in cache
   */
  async setUserState(userId: string, state: Record<string, unknown> | object): Promise<void> {
    if (!redisClient.isReady()) {
      logger.warn('Redis not ready, skipping cache set');
      return;
    }

    try {
      const key = this.getUserStateKey(userId);
      await this.redis.setex(key, this.ttl, JSON.stringify(state));
    } catch (error) {
      logger.error('Error setting user state in cache:', error);
    }
  }

  /**
   * Invalidate user state cache
   */
  async invalidateUserState(userId: string): Promise<void> {
    if (!redisClient.isReady()) {
      return;
    }

    try {
      const key = this.getUserStateKey(userId);
      await this.redis.del(key);
    } catch (error) {
      logger.error('Error invalidating user state cache:', error);
    }
  }

  /**
   * Get question pool for difficulty
   */
  async getQuestionPool<T = Record<string, unknown>>(difficulty: number): Promise<T[] | null> {
    if (!redisClient.isReady()) {
      return null;
    }

    try {
      const key = this.getQuestionPoolKey(difficulty);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting question pool from cache:', error);
      return null;
    }
  }

  /**
   * Set question pool for difficulty
   */
  async setQuestionPool(difficulty: number, questions: Record<string, unknown>[] | object[]): Promise<void> {
    if (!redisClient.isReady()) {
      return;
    }

    try {
      const key = this.getQuestionPoolKey(difficulty);
      // Cache question pools for longer (1 hour)
      await this.redis.setex(key, 3600, JSON.stringify(questions));
    } catch (error) {
      logger.error('Error setting question pool in cache:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    if (!redisClient.isReady()) {
      return;
    }

    try {
      await this.redis.flushdb();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }
}

export default new CacheService();
