import { Queue } from 'bullmq';
export declare const METRICS_SYNC_QUEUE = "metrics-sync";
export type MetricsSyncJobData = {
    type: 'post';
    postId: string;
    userId: string;
} | {
    type: 'batch';
};
export declare function getMetricsSyncQueue(): Queue<MetricsSyncJobData>;
/** Enqueue a single-post metrics refresh. */
export declare function enqueuePostMetricsSync(postId: string, userId: string): Promise<void>;
/** Schedule a repeatable batch sync (every 6 hours). */
export declare function scheduleRecurringMetricsSync(): Promise<void>;
//# sourceMappingURL=metrics-sync.queue.d.ts.map