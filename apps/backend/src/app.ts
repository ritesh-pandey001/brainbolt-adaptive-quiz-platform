import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { quizRoutes } from './modules/quiz';
import { leaderboardRoutes } from './modules/leaderboard';
import { sessionRoutes } from './modules/session';
import { healthRoutes } from './modules/health';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        config.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Security plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  });

  await fastify.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
  });

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Zod validation errors
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.message,
        statusCode: 400,
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.code(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        statusCode: 429,
      });
    }

    // Default error
    const statusCode = error.statusCode || 500;
    return reply.code(statusCode).send({
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      statusCode,
    });
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(quizRoutes, { prefix: `/${config.API_VERSION}/quiz` });
  await fastify.register(leaderboardRoutes, {
    prefix: `/${config.API_VERSION}/leaderboard`,
  });
  await fastify.register(sessionRoutes, {
    prefix: `/${config.API_VERSION}/session`,
  });

  // Root route
  fastify.get('/', async (request, reply) => {
    return reply.send({
      name: 'BrainBolt API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        ready: '/ready',
        quiz: `/${config.API_VERSION}/quiz`,
        leaderboard: `/${config.API_VERSION}/leaderboard`,
        session: `/${config.API_VERSION}/session`,
      },
    });
  });

  return fastify;
}
