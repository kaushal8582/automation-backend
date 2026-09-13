import { Queue } from 'bullmq';
import { getBullMqConnectionOptions } from '../config/redis.js';

export const CONTENT_IMPORT_QUEUE = 'content-import';

export type ContentImportJobData = {
  jobId: string;
  userId: string;
  socialAccountId?: string;
  externalId?: string;
  sourceUrl?: string;
  sourceResourceId?: string;
  sourceType: 'account' | 'url' | 'instagram_public';
  forceDuplicate?: boolean;
};

let queue: Queue<ContentImportJobData> | null = null;

export function getContentImportQueue(): Queue<ContentImportJobData> {
  if (!queue) {
    queue = new Queue<ContentImportJobData>(CONTENT_IMPORT_QUEUE, {
      connection: getBullMqConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return queue;
}
