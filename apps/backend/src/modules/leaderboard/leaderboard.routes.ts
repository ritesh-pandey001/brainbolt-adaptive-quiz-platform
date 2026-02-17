import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import leaderboardService from './leaderboard.service';
import prisma from '../../lib/prisma';

export async function leaderboardRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/leaderboard/score
   * Get top scores leaderboard
   */
  fastify.get(
    '/score',
    async (
      request: FastifyRequest<{
        Querystring: { limit?: string; userId?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const limit = request.query.limit ? parseInt(request.query.limit, 10) : undefined;
        const userId = request.query.userId;

        const leaderboard = await leaderboardService.getTopScores(limit);

        let userEntry: { userId: string; username: string; score: number; rank: number } | undefined;

        if (userId) {
          const existing = leaderboard.find((e) => e.userId === userId);
          if (existing) {
            userEntry = existing;
          } else {
            const userRank = await leaderboardService.getUserScoreRank(userId);
            if (userRank) {
              const userState = await prisma.userState.findUnique({
                where: { userId },
                include: { user: { select: { username: true } } },
              });
              if (userState) {
                userEntry = {
                  userId,
                  username: userState.user.username,
                  score: userState.totalScore,
                  rank: userRank,
                };
              }
            }
          }
        }

        return reply.code(200).send({ leaderboard, userEntry });
      } catch (error: unknown) {
        const err = error as Error;
        request.log.error(err);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get score leaderboard',
        });
      }
    }
  );

  /**
   * GET /v1/leaderboard/streak
   * Get top streaks leaderboard
   */
  fastify.get(
    '/streak',
    async (
      request: FastifyRequest<{
        Querystring: { limit?: string; userId?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const limit = request.query.limit ? parseInt(request.query.limit, 10) : undefined;
        const userId = request.query.userId;

        const leaderboard = await leaderboardService.getTopStreaks(limit);

        let userEntry: { userId: string; username: string; score: number; rank: number } | undefined;

        if (userId) {
          const existing = leaderboard.find((e) => e.userId === userId);
          if (existing) {
            userEntry = existing;
          } else {
            const userRank = await leaderboardService.getUserStreakRank(userId);
            if (userRank) {
              const userState = await prisma.userState.findUnique({
                where: { userId },
                include: { user: { select: { username: true } } },
              });
              if (userState) {
                userEntry = {
                  userId,
                  username: userState.user.username,
                  score: userState.streak,
                  rank: userRank,
                };
              }
            }
          }
        }

        return reply.code(200).send({ leaderboard, userEntry });
      } catch (error: unknown) {
        const err = error as Error;
        request.log.error(err);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get streak leaderboard',
        });
      }
    }
  );
}
