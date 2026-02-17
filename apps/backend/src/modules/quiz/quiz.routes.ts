import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import quizService from './quiz.service';
import {
  GetNextQuestionRequestSchema,
  SubmitAnswerRequestSchema,
  GetMetricsRequestSchema,
} from '@brainbolt/shared';

export async function quizRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/quiz/next
   * Get next question for user based on adaptive difficulty
   */
  fastify.get(
    '/next',
    async (
      request: FastifyRequest<{
        Querystring: { userId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId } = GetNextQuestionRequestSchema.parse(request.query);
        const response = await quizService.getNextQuestion(userId);
        return reply.code(200).send(response);
      } catch (error: unknown) {
        const err = error as Error & { code?: string };
        request.log.error(err);
        return reply.code(400).send({
          error: 'Bad Request',
          message: err.message || 'Failed to get next question',
        });
      }
    }
  );

  /**
   * POST /v1/quiz/answer
   * Submit answer with idempotency + optimistic locking
   */
  fastify.post(
    '/answer',
    async (
      request: FastifyRequest<{
        Body: {
          userId: string;
          questionId: string;
          selectedAnswer: number;
          answerIdempotencyKey: string;
          stateVersion: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const validatedRequest = SubmitAnswerRequestSchema.parse(request.body);
        const response = await quizService.submitAnswer(validatedRequest);
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
   * GET /v1/quiz/metrics
   * Get user performance metrics
   */
  fastify.get(
    '/metrics',
    async (
      request: FastifyRequest<{
        Querystring: { userId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId } = GetMetricsRequestSchema.parse(request.query);
        const response = await quizService.getMetrics(userId);
        return reply.code(200).send(response);
      } catch (error: unknown) {
        const err = error as Error;
        request.log.error(err);
        return reply.code(400).send({
          error: 'Bad Request',
          message: err.message || 'Failed to get metrics',
        });
      }
    }
  );
}
