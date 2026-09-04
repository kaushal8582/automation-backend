import { Queue } from 'bullmq';
import { getBullMqConnectionOptions } from '../config/redis.js';

export const METRICS_SYNC_QUEUE = 'metrics-sync';

export type MetricsSyncJobData =
  | { type: 'post'; postId: string; userId: string }
  | { type: 'batch' };

let queue: Queue<MetricsSyncJobData> | null = null;

export function getMetricsSyncQueue(): Queue<MetricsSyncJobData> {
  if (!queue) {
    queue = new Queue<MetricsSyncJobData>(METRICS_SYNC_QUEUE, {
      connection: getBullMqConnectionOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return queue;
}

/** Enqueue a single-post metrics refresh. */
export async function enqueuePostMetricsSync(postId: string, userId: string): Promise<void> {
  const q = getMetricsSyncQueue();
  await q.add(
    'sync-post',
    { type: 'post', postId, userId },
    {
      jobId: `metrics:post:${postId}`, // deduplicate: only one active job per post
      delay: 5 * 60 * 1000, // wait 5 min after publish before first fetch
    },
  );
}

/** Schedule a repeatable batch sync (every 6 hours). */
export async function scheduleRecurringMetricsSync(): Promise<void> {
  const q = getMetricsSyncQueue();
  // Remove old repeat jobs to avoid duplicates across restarts
  const existing = await q.getRepeatableJobs();
  for (const job of existing) {
    if (job.name === 'batch-sync') {
      await q.removeRepeatableByKey(job.key);
    }
  }
  await q.add(
    'batch-sync',
    { type: 'batch' },
    {
      repeat: { every: 6 * 60 * 60 * 1000 }, // every 6 hours
    },
  );
}
