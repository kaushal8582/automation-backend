import { Worker } from 'bullmq';
import { getBullMqConnectionOptions } from '../config/redis.js';
import { resolveAccessibleMediaUrl } from '../config/r2.js';
import { AppError } from '../middlewares/error-handler.js';
import { MediaAsset } from '../models/media-asset.model.js';
import { Post } from '../models/post.model.js';
import { PostDestination } from '../models/post-destination.model.js';
import { SocialAccount } from '../models/social-account.model.js';
import { InstagramPublisher } from '../providers/instagram/instagram-publisher.js';
import { FacebookPublisher } from '../providers/facebook/facebook-publisher.js';
import { metaTokenService } from '../services/meta-token.service.js';
import { enqueuePostMetricsSync } from '../queues/metrics-sync.queue.js';
import { aggregatePostStatus, computeDestinationCounts } from '../utils/post-status.js';
import { createLogger } from '../utils/logger.js';
import { PUBLISH_DESTINATION_QUEUE, } from '../queues/publish-destination.queue.js';
const logger = createLogger('publish-destination-worker');
async function syncPostFromDestinations(postId) {
    const destinations = await PostDestination.find({ postId }).select('status');
    const statuses = destinations.map((d) => d.status);
    const counts = computeDestinationCounts(statuses);
    const status = aggregatePostStatus(statuses);
    await Post.findByIdAndUpdate(postId, {
        $set: {
            status,
            totalDestinations: counts.totalDestinations,
            successfulDestinations: counts.successfulDestinations,
            failedDestinations: counts.failedDestinations,
        },
    });
}
export async function publishDestinationJob(job) {
    const { destinationId, userId } = job.data;
    const destination = await PostDestination.findById(destinationId);
    if (!destination) {
        throw new AppError(`Destination ${destinationId} not found`, 404, 'DESTINATION_NOT_FOUND');
    }
    // Idempotency: skip if already terminal
    if (destination.status === 'published' || destination.status === 'cancelled') {
        logger.info('Destination already settled, skipping', { destinationId, status: destination.status });
        return;
    }
    const account = await SocialAccount.findOne({ _id: destination.socialAccountId, userId });
    if (!account) {
        throw new AppError('Social account not found', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
    }
    const post = await Post.findById(destination.postId);
    if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }
    const media = await MediaAsset.findById(post.mediaId);
    if (!media) {
        throw new AppError('Media not found', 404, 'MEDIA_NOT_FOUND');
    }
    const videoUrl = await resolveAccessibleMediaUrl(media.r2Key, media.publicUrl);
    if (!videoUrl.startsWith('http')) {
        throw new AppError('Video public URL is unavailable. Set R2_PUBLIC_URL.', 400, 'MEDIA_PUBLIC_URL_REQUIRED');
    }
    let coverUrl;
    if (post.thumbnailMediaId) {
        const thumb = await MediaAsset.findById(post.thumbnailMediaId);
        if (thumb?.status === 'ready') {
            try {
                const url = await resolveAccessibleMediaUrl(thumb.r2Key, thumb.publicUrl);
                if (url.startsWith('http'))
                    coverUrl = url;
            }
            catch (error) {
                logger.warn('Thumbnail URL resolve failed; continuing without cover', {
                    postId: post.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    const effectiveCaption = post.instagramCaption ?? post.caption ?? '';
    const publishOptions = post.publishOptions ?? {};
    destination.status = 'publishing';
    destination.attempts = (destination.attempts ?? 0) + 1;
    await destination.save();
    logger.info('Publishing destination', {
        destinationId,
        attempt: destination.attempts,
        platform: destination.platform,
    });
    const accessToken = await metaTokenService.getDecryptedAccessToken(userId, account.id);
    let result;
    if (destination.platform === 'instagram') {
        const publisher = new InstagramPublisher();
        result = await publisher.publishReel({
            platformAccountId: account.platformAccountId,
            accessToken,
            videoUrl,
            caption: effectiveCaption,
            coverUrl,
            shareToFeed: publishOptions.shareToFeed,
            hideLikeCount: publishOptions.hideLikeCount,
        });
    }
    else if (destination.platform === 'facebook') {
        const publisher = new FacebookPublisher();
        result = await publisher.publishVideo({
            platformAccountId: account.platformAccountId,
            accessToken,
            videoUrl,
            caption: effectiveCaption,
            coverUrl,
        });
    }
    else {
        throw new AppError(`Unsupported platform: ${destination.platform}`, 400, 'UNSUPPORTED_PLATFORM');
    }
    destination.status = 'published';
    destination.platformContainerId = result.platformContainerId;
    destination.platformPostId = result.platformPostId;
    destination.publishedAt = new Date();
    destination.lastError = undefined;
    destination.lastErrorCode = undefined;
    await destination.save();
    await syncPostFromDestinations(destination.postId);
    // Enqueue a metrics sync ~5 min after publish
    try {
        await enqueuePostMetricsSync(destination.postId.toString(), userId);
    }
    catch (e) {
        logger.warn('Failed to enqueue metrics sync', {
            destinationId,
            error: e instanceof Error ? e.message : String(e),
        });
    }
    logger.info('Destination published', {
        destinationId,
        platformPostId: result.platformPostId,
    });
}
export function createPublishDestinationWorker(concurrency) {
    const worker = new Worker(PUBLISH_DESTINATION_QUEUE, publishDestinationJob, {
        connection: getBullMqConnectionOptions(),
        concurrency,
    });
    worker.on('completed', (job) => {
        logger.info('Job completed', { jobId: job.id, destinationId: job.data.destinationId });
    });
    worker.on('failed', async (job, error) => {
        if (!job)
            return;
        const { destinationId, userId } = job.data;
        const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3);
        logger.error('Job failed', {
            jobId: job.id,
            destinationId,
            attempt: job.attemptsMade,
            isLastAttempt,
            error: error.message,
        });
        if (isLastAttempt) {
            try {
                const destination = await PostDestination.findById(destinationId);
                if (destination && destination.status !== 'published') {
                    const code = error instanceof AppError ? error.code : 'PUBLISH_FAILED';
                    destination.status = 'failed';
                    destination.lastError = error.message;
                    destination.lastErrorCode = code;
                    await destination.save();
                    await syncPostFromDestinations(destination.postId);
                    if (error instanceof AppError && error.code === 'META_TOKEN_EXPIRED') {
                        const account = await SocialAccount.findById(destination.socialAccountId);
                        if (account) {
                            await metaTokenService.markReconnectRequired(userId, account.id, 'expired');
                        }
                    }
                }
            }
            catch (syncError) {
                logger.error('Failed to mark destination as failed', {
                    destinationId,
                    error: syncError instanceof Error ? syncError.message : String(syncError),
                });
            }
        }
    });
    return worker;
}
//# sourceMappingURL=publish-destination.worker.js.map