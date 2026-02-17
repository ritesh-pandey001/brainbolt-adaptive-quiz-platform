import { buildApp } from './app';
import { config } from './config';
import prisma from './lib/prisma';
import redisClient from './lib/redis';
import leaderboardService from './modules/leaderboard/leaderboard.service';

async function main() {
  try {
    // Build Fastify app
    const app = await buildApp();

    // Start server
    await app.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    app.log.info(`Server listening on port ${config.PORT}`);
    app.log.info(`Environment: ${config.NODE_ENV}`);
    app.log.info(`API version: ${config.API_VERSION}`);

    // Initialize leaderboard from database
    setTimeout(async () => {
      try {
        await leaderboardService.initializeFromDB();
        app.log.info('Leaderboard initialized');
      } catch (error) {
        app.log.error({ err: error }, 'Failed to initialize leaderboard');
      }
    }, 1000);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        app.log.info(`Received ${signal}, shutting down gracefully...`);

        try {
          await app.close();
          await prisma.$disconnect();
          await redisClient.disconnect();
          app.log.info('Shutdown complete');
          process.exit(0);
        } catch (error) {
          app.log.error({ err: error }, 'Error during shutdown');
          process.exit(1);
        }
      });
    });
  } catch (error) {
    // Logger may not be available if app failed to build
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to start server: ${message}\n`);
    process.exit(1);
  }
}

main();
