import type { DestinationStatus, PostStatus } from '../types/domain.js';
/**
 * Aggregate Post.status from destination statuses.
 *
 * Rules:
 * - all pending → scheduled (delayed / waiting for scheduled time)
 * - all queued (no pending) → queued (immediate, waiting for worker)
 * - some processing → processing
 * - all published → published
 * - published + failed → partially_published
 * - all failed → failed
 * - all cancelled → cancelled
 */
export declare function aggregatePostStatus(destinationStatuses: DestinationStatus[]): PostStatus;
export declare function computeDestinationCounts(destinationStatuses: DestinationStatus[]): {
    totalDestinations: number;
    successfulDestinations: number;
    failedDestinations: number;
};
//# sourceMappingURL=post-status.d.ts.map