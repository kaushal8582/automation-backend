import { Queue } from 'bullmq';
import { getBullMqConnectionOptions } from '../config/redis.js';
export const PUBLISH_DESTINATION_QUEUE = 'publish-destination';
let queue = null;
export function getPublishDestinationQueue() {
    if (!queue) {
        queue = new Queue(PUBLISH_DESTINATION_QUEUE, {
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
//# sourceMappingURL=publish-destination.queue.js.map