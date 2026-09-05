import { Worker, type Job } from 'bullmq';
import { type MetricsSyncJobData } from '../queues/metrics-sync.queue.js';
export declare function metricsSyncJob(job: Job<MetricsSyncJobData>): Promise<void>;
export declare function createMetricsSyncWorker(): Worker<MetricsSyncJobData>;
//# sourceMappingURL=metrics-sync.worker.d.ts.map