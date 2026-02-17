import Redis from 'ioredis';
import { config } from '../config';
import logger from './logger';

class RedisClient {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      logger.error({ err }, 'Redis error');
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.info('Redis connection closed');
      this.isConnected = false;
    });
  }

  getClient(): Redis {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

const redisClient = new RedisClient();

export default redisClient;
