import { connectMongo, disconnectMongo } from './config/mongo.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { env } from './config/env.js';
import { createPublishDestinationWorker } from './workers/publish-destination.worker.js';
import { createMetricsSyncWorker } from './workers/metrics-sync.worker.js';
import { scheduleRecurringMetricsSync } from './queues/metrics-sync.queue.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('worker');

async function bootstrapWorker(): Promise<void> {
  await connectMongo();
  await connectRedis();

  const concurrency = env.PUBLISH_WORKER_CONCURRENCY;
  const publishWorker = createPublishDestinationWorker(concurrency);
  const metricsWorker = createMetricsSyncWorker();

  // Register the 6-hour repeatable batch metrics sync
  await scheduleRecurringMetricsSync();

  logger.info('Worker process ready', { concurrency });

  const shutdown = async (signal: string) => {
    logger.info('Worker shutting down', { signal });
    await publishWorker.close();
    await metricsWorker.close();
    await disconnectRedis();
    await disconnectMongo();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrapWorker().catch((error) => {
  logger.error('Failed to start worker', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
