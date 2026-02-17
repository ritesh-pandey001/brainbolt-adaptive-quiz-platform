import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../../lib/prisma';
import redisClient from '../../lib/redis';

const startTime = Date.now();

export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health
   * Comprehensive health check for monitoring and Docker healthchecks
   */
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const checkStart = Date.now();

      let dbHealthy = false;
      let dbLatency = 0;
      try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatency = Date.now() - dbStart;
        dbHealthy = true;
      } catch (dbError: unknown) {
        request.log.error({ err: dbError }, 'Database health check failed');
      }

      const redisHealthy = redisClient.isReady();
      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
      const status = dbHealthy && redisHealthy ? 'healthy' : 'degraded';
      const statusCode = status === 'healthy' ? 200 : 503;

      return reply.code(statusCode).send({
        status,
        timestamp: new Date().toISOString(),
        uptime: uptimeSeconds,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: dbHealthy ? 'up' : 'down',
          redis: redisHealthy ? 'up' : 'down',
        },
        latency: {
          database: dbHealthy ? dbLatency : null,
          healthCheck: Date.now() - checkStart,
        },
      });
    } catch (error: unknown) {
      const err = error as Error;
      request.log.error(err);
      return reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: err.message,
      });
    }
  });

  /**
   * GET /ready
   * Readiness probe
   */
  fastify.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.code(200).send({ status: 'ready' });
    } catch (error: unknown) {
      const err = error as Error;
      request.log.error(err);
      return reply.code(503).send({ status: 'not ready', error: err.message });
    }
  });
}
