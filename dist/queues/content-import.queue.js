import { Queue } from 'bullmq';
import { getBullMqConnectionOptions } from '../config/redis.js';
export const CONTENT_IMPORT_QUEUE = 'content-import';
let queue = null;
export function getContentImportQueue() {
    if (!queue) {
        queue = new Queue(CONTENT_IMPORT_QUEUE, {
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
//# sourceMappingURL=content-import.queue.js.map