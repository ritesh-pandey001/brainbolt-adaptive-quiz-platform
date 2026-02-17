import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),

  // Cache
  CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
  LEADERBOARD_TOP_N: parseInt(process.env.LEADERBOARD_TOP_N || '100', 10),

  // Adaptive Algorithm
  MIN_DIFFICULTY: parseInt(process.env.MIN_DIFFICULTY || '1', 10),
  MAX_DIFFICULTY: parseInt(process.env.MAX_DIFFICULTY || '10', 10),
  CONFIDENCE_BUFFER_SIZE: parseInt(process.env.CONFIDENCE_BUFFER_SIZE || '2', 10),
  INACTIVITY_DECAY_MINUTES: parseInt(process.env.INACTIVITY_DECAY_MINUTES || '30', 10),
  MAX_STREAK_MULTIPLIER: parseFloat(process.env.MAX_STREAK_MULTIPLIER || '2.0'),
  STREAK_MULTIPLIER_RATE: parseFloat(process.env.STREAK_MULTIPLIER_RATE || '0.1'),
};

// Validate critical config
if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}
