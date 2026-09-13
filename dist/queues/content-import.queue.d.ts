import { Queue } from 'bullmq';
export declare const CONTENT_IMPORT_QUEUE = "content-import";
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
export declare function getContentImportQueue(): Queue<ContentImportJobData>;
//# sourceMappingURL=content-import.queue.d.ts.map