import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import sessionService from './session.service';
import {
  StartSessionRequestSchema,
  SessionAnswerRequestSchema,
  NavigateRequestSchema,
  ToggleFlagRequestSchema,
  FinishSessionRequestSchema,
} from '@brainbolt/shared';

export async function sessionRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/session/start
   * Start a new exam session
   */
  fastify.post(
    '/start',
    async (
      request: FastifyRequest<{
        Body: { userId: string; totalQuestions?: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId, totalQuestions } = StartSessionRequestSchema.parse(request.body);
        const response = await sessionService.startSession(userId, totalQuestions);
        return reply.code(200).send(response);
      } catch (error: unknown) {
        const err = error as Error;
        request.log.error(err);
        return reply.code(400).send({
          error: 'Bad Request',
          message: err.message || 'Failed to start session',
        });
      }
    }
  );

  /**
   * GET /v1/session/current
   * Get current active session state
   */
  fastify.get(
    '/current',
    async (
      request: FastifyRequest<{
        Querystring: { userId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.query.userId;
        if (!userId) {
          return reply.code(400).send({ error: 'Bad Request', message: 'userId is required' });
        }
        const response = await sessionService.getSessionState(userId);
        return reply.code(200).send(response);
      } catch (error: unknown) {
        const err = error as Error;
        if (err.message === 'NO_ACTIVE_SESSION') {
          return reply.code(404).send({ error: 'Not Found', message: 'No active session' });
        }
        request.log.error(err);
        return reply.code(400).send({
          error: 'Bad Request',
          message: err.message || 'Failed to get session',
        });
      }
    }
  );

  /**
   * POST /v1/session/answer
   * Submit answer within a session
   */
  fastify.post(
    '/answer',
    async (
      request: FastifyRequest<{
        Body: {
          userId: string;
          sessionId: string;
          questionId: string;
          selectedAnswer: number;
          answerIdempotencyKey: string;
          stateVersion: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const validated = SessionAnswerRequestSchema.parse(request.body);
        const response = await sessionService.submitAnswer(validated);
        return reply.code(200).send(response);
      } catch (error: unknown) {
        const err = error as Error & { code?: string };
        request.log.error(err);

        if (err.message.includes('version mismatch') || err.message.includes('State version mismatch')) {
          return reply.code(409).send({
            error: 'Conflict',
            message: err.message,
            statusCode: 409,
          });
        }

        if (err.code === 'P2002') {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Duplicate submission detected',
            statusCode: 409,
          });
        }

        return reply.code(400).send({
          error: 'Bad Request',
          message: err.message || 'Failed to submit answer',
        });
      }
    }
  );

  /**
   * POST /v1/session/navigate
   * Navigate to a specific question
   */
  fastify.post(
    '/navigate',
    async (
      request: FastifyRequest<{
        Body: { userId: string; sessionId: string; targetIndex: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId, sessionId, targetIndex } = NavigateRequestSchema.parse(request.body);
        const response = await sessionService.navigate(userId, sessionId, targetIndex);
        return reply.code(200).send(response);
      } catch (error: unknown) {
        const err = error as Error;
        request.log.error(err);
        return reply.code(400).send({
          error: 'Bad Request',
          message: err.message || 'Failed to navigate',
        });
      }
    }
  );

  /**
   * POST /v1/session/flag
   * Toggle question flag for later review
   */
  fastify.post(
    '/flag',
    async (
      request: FastifyRequest<{
        Body: { userId: string; sessionId: string; questionId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId, sessionId, questionId } = ToggleFlagRequestSchema.parse(request.body);
        const response = await sessionService.toggleFlag(userId, sessionId, questionId);
        return reply.code(200).send(response);
      } catch (error: unknown) {
        const err = error as Error;
        request.log.error(err);
        return reply.code(400).send({
          error: 'Bad Request',
          message: err.message || 'Failed to toggle flag',
        });
      }
    }
  );

  /**
   * POST /v1/session/finish
   * Finish the exam and get summary
   */
  fastify.post(
    '/finish',
    async (
      request: FastifyRequest<{
        Body: { userId: string; sessionId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId, sessionId } = FinishSessionRequestSchema.parse(request.body);
        const response = await sessionService.finishSession(userId, sessionId);
        return reply.code(200).send(response);
      } catch (error: unknown) {
        const err = error as Error;
        request.log.error(err);
        return reply.code(400).send({
          error: 'Bad Request',
          message: err.message || 'Failed to finish session',
        });
      }
    }
  );
}
