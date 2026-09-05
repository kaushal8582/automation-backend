import { Queue } from 'bullmq';
export declare const PUBLISH_DESTINATION_QUEUE = "publish-destination";
export type PublishDestinationJobData = {
    destinationId: string;
    userId: string;
};
export declare function getPublishDestinationQueue(): Queue<PublishDestinationJobData>;
//# sourceMappingURL=publish-destination.queue.d.ts.map