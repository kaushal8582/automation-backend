import { Queue } from 'bullmq';
import { getBullMqConnectionOptions } from '../config/redis.js';

export const PUBLISH_DESTINATION_QUEUE = 'publish-destination';

export type PublishDestinationJobData = {
  destinationId: string;
  userId: string;
};

let queue: Queue<PublishDestinationJobData> | null = null;

export function getPublishDestinationQueue(): Queue<PublishDestinationJobData> {
  if (!queue) {
    queue = new Queue<PublishDestinationJobData>(PUBLISH_DESTINATION_QUEUE, {
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
