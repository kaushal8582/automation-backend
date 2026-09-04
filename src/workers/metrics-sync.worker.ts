import { Worker, type Job } from 'bullmq';
import { getBullMqConnectionOptions } from '../config/redis.js';
import { syncPostMetrics, syncRecentMetrics } from '../services/metrics.service.js';
import { createLogger } from '../utils/logger.js';
import {
  METRICS_SYNC_QUEUE,
  type MetricsSyncJobData,
} from '../queues/metrics-sync.queue.js';

const logger = createLogger('metrics-sync-worker');

export async function metricsSyncJob(job: Job<MetricsSyncJobData>): Promise<void> {
  const data = job.data;

  if (data.type === 'post') {
    logger.info('Syncing metrics for post', { postId: data.postId });
    await syncPostMetrics(data.postId, data.userId);
  } else if (data.type === 'batch') {
    logger.info('Running batch metrics sync');
    await syncRecentMetrics();
  }
}

export function createMetricsSyncWorker(): Worker<MetricsSyncJobData> {
  const worker = new Worker<MetricsSyncJobData>(METRICS_SYNC_QUEUE, metricsSyncJob, {
    connection: getBullMqConnectionOptions(),
    concurrency: 3,
  });

  worker.on('completed', (job) => {
    logger.info('Metrics job completed', { jobId: job.id, type: job.data.type });
  });

  worker.on('failed', (job, error) => {
    if (!job) return;
    logger.error('Metrics job failed', {
      jobId: job.id,
      type: job.data.type,
      error: error.message,
    });
  });

  return worker;
}
