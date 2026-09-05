import { Worker, type Job } from 'bullmq';
import { type PublishDestinationJobData } from '../queues/publish-destination.queue.js';
export declare function publishDestinationJob(job: Job<PublishDestinationJobData>): Promise<void>;
export declare function createPublishDestinationWorker(concurrency: number): Worker<PublishDestinationJobData>;
//# sourceMappingURL=publish-destination.worker.d.ts.map