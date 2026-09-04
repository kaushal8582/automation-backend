import type { DestinationStatus, PostStatus } from '../types/domain.js';

const PROCESSING_STATUSES: ReadonlySet<DestinationStatus> = new Set([
  'processing',
  'uploading',
  'processing_media',
  'ready_to_publish',
  'publishing',
]);

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
export function aggregatePostStatus(destinationStatuses: DestinationStatus[]): PostStatus {
  if (destinationStatuses.length === 0) {
    return 'draft';
  }

  const total = destinationStatuses.length;
  let published = 0;
  let failed = 0;
  let cancelled = 0;
  let processing = 0;
  let pending = 0;
  let queued = 0;

  for (const status of destinationStatuses) {
    if (status === 'published') published += 1;
    else if (status === 'failed') failed += 1;
    else if (status === 'cancelled') cancelled += 1;
    else if (PROCESSING_STATUSES.has(status)) processing += 1;
    else if (status === 'pending') pending += 1;
    else if (status === 'queued') queued += 1;
  }

  if (cancelled === total) return 'cancelled';
  if (published === total) return 'published';
  if (failed === total) return 'failed';
  if (published > 0 && failed > 0) return 'partially_published';
  if (published > 0 && published + failed + cancelled === total) return 'partially_published';
  if (processing > 0) return 'processing';
  // All waiting: pending = scheduled, queued = queued (immediate)
  const allWaiting = pending + queued + cancelled === total;
  if (allWaiting && pending > 0) return 'scheduled';
  if (allWaiting && queued > 0) return 'queued';

  return 'processing';
}

export function computeDestinationCounts(destinationStatuses: DestinationStatus[]): {
  totalDestinations: number;
  successfulDestinations: number;
  failedDestinations: number;
} {
  return {
    totalDestinations: destinationStatuses.length,
    successfulDestinations: destinationStatuses.filter((s) => s === 'published').length,
    failedDestinations: destinationStatuses.filter((s) => s === 'failed').length,
  };
}
