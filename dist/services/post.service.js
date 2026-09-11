import { Types } from 'mongoose';
import { resolveAccessibleMediaUrl } from '../config/r2.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.js';
import { MediaAsset } from '../models/media-asset.model.js';
import { Post } from '../models/post.model.js';
import { PostDestination, } from '../models/post-destination.model.js';
import { SocialAccount } from '../models/social-account.model.js';
import { User } from '../models/user.model.js';
import { getPublishDestinationQueue } from '../queues/publish-destination.queue.js';
import { aggregatePostStatus, computeDestinationCounts, } from '../utils/post-status.js';
export function toPublicDestination(dest) {
    return {
        id: dest._id.toString(),
        postId: dest.postId.toString(),
        socialAccountId: dest.socialAccountId.toString(),
        platform: dest.platform,
        status: dest.status,
        scheduledAt: dest.scheduledAt,
        platformContainerId: dest.platformContainerId,
        platformPostId: dest.platformPostId,
        platformPostUrl: dest.platformPostUrl,
        attempts: dest.attempts,
        maxAttempts: dest.maxAttempts,
        lastError: dest.lastError,
        lastErrorCode: dest.lastErrorCode,
        publishedAt: dest.publishedAt,
        createdAt: dest.createdAt,
        updatedAt: dest.updatedAt,
    };
}
export function toPublicPost(post) {
    return {
        id: post._id.toString(),
        mediaId: post.mediaId.toString(),
        thumbnailMediaId: post.thumbnailMediaId?.toString(),
        caption: post.caption,
        instagramCaption: post.instagramCaption,
        facebookCaption: post.facebookCaption,
        publishMode: post.publishMode,
        scheduledAt: post.scheduledAt,
        timezone: post.timezone,
        status: post.status,
        totalDestinations: post.totalDestinations,
        successfulDestinations: post.successfulDestinations,
        failedDestinations: post.failedDestinations,
        publishOptions: post.publishOptions,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
    };
}
export async function syncPostFromDestinations(postId) {
    const destinations = await PostDestination.find({ postId }).select('status');
    const statuses = destinations.map((d) => d.status);
    const counts = computeDestinationCounts(statuses);
    const status = aggregatePostStatus(statuses);
    const updated = await Post.findByIdAndUpdate(postId, {
        $set: {
            status,
            totalDestinations: counts.totalDestinations,
            successfulDestinations: counts.successfulDestinations,
            failedDestinations: counts.failedDestinations,
        },
    }, { new: true });
    if (!updated) {
        throw new AppError('Post not found after update', 404, 'POST_NOT_FOUND');
    }
    return updated;
}
export async function createPost(userId, input) {
    if (!Types.ObjectId.isValid(input.mediaId)) {
        throw new AppError('Invalid media id', 400, 'INVALID_MEDIA_ID');
    }
    const uniqueAccountIds = [...new Set(input.socialAccountIds)];
    for (const id of uniqueAccountIds) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError(`Invalid social account id: ${id}`, 400, 'INVALID_SOCIAL_ACCOUNT_ID');
        }
    }
    const user = await User.findById(userId).select('timezone');
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const media = await MediaAsset.findOne({ _id: input.mediaId, userId, type: 'video' });
    if (!media || media.status !== 'ready') {
        throw new AppError('Ready video media not found', 404, 'MEDIA_NOT_FOUND');
    }
    let thumbnailMediaId;
    if (input.thumbnailMediaId) {
        if (!Types.ObjectId.isValid(input.thumbnailMediaId)) {
            throw new AppError('Invalid thumbnail media id', 400, 'INVALID_THUMBNAIL_MEDIA_ID');
        }
        const thumb = await MediaAsset.findOne({
            _id: input.thumbnailMediaId,
            userId,
            type: { $in: ['image', 'thumbnail'] },
            status: 'ready',
        });
        if (!thumb) {
            throw new AppError('Ready thumbnail image not found', 404, 'THUMBNAIL_NOT_FOUND');
        }
        thumbnailMediaId = thumb._id;
    }
    // Validate all requested accounts (instagram + facebook)
    const accounts = await SocialAccount.find({
        _id: { $in: uniqueAccountIds },
        userId,
        platform: { $in: ['instagram', 'facebook'] },
    });
    if (accounts.length !== uniqueAccountIds.length) {
        throw new AppError('One or more social accounts not found', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
    }
    const inactiveAccount = accounts.find((a) => a.status !== 'active');
    if (inactiveAccount) {
        throw new AppError(`Account ${inactiveAccount.username ?? inactiveAccount.id} is not active. Reconnect and try again.`, 400, 'SOCIAL_ACCOUNT_INACTIVE', { status: inactiveAccount.status });
    }
    // Validate accessible video URL before creating records
    const usedTemporaryUrl = !env.R2_PUBLIC_URL;
    const videoUrl = await resolveAccessibleMediaUrl(media.r2Key, media.publicUrl);
    if (!videoUrl.startsWith('http')) {
        throw new AppError('Video public URL is unavailable. Set R2_PUBLIC_URL for Meta publishing.', 400, 'MEDIA_PUBLIC_URL_REQUIRED');
    }
    // Scheduling
    const isScheduled = Boolean(input.scheduledAt);
    let scheduledDate;
    let delayMs = 0;
    if (isScheduled) {
        scheduledDate = new Date(input.scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
            throw new AppError('Invalid scheduledAt date', 400, 'VALIDATION_ERROR');
        }
        const minScheduleMs = 5 * 60 * 1000; // 5 minutes
        delayMs = scheduledDate.getTime() - Date.now();
        if (delayMs < minScheduleMs) {
            throw new AppError('Scheduled time must be at least 5 minutes in the future', 400, 'SCHEDULE_TOO_EARLY');
        }
    }
    const postTimezone = input.timezone || user.timezone || 'UTC';
    const publishMode = isScheduled ? 'scheduled' : 'now';
    const initialDestStatus = isScheduled ? 'pending' : 'queued';
    const initialPostStatus = isScheduled ? 'scheduled' : 'queued';
    // Create Post
    const post = await Post.create({
        userId,
        mediaId: media._id,
        thumbnailMediaId,
        caption: input.caption ?? '',
        instagramCaption: input.instagramCaption,
        publishMode,
        scheduledAt: scheduledDate,
        timezone: postTimezone,
        status: initialPostStatus,
        totalDestinations: uniqueAccountIds.length,
        successfulDestinations: 0,
        failedDestinations: 0,
        publishOptions: input.options,
    });
    // Create one PostDestination per account
    const destinations = await PostDestination.insertMany(accounts.map((account) => ({
        postId: post._id,
        socialAccountId: account._id,
        platform: account.platform,
        status: initialDestStatus,
        scheduledAt: scheduledDate,
        attempts: 0,
        maxAttempts: 3,
    })));
    // Enqueue one BullMQ job per destination
    const queue = getPublishDestinationQueue();
    await Promise.all(destinations.map((dest) => queue.add('publish', { destinationId: dest._id.toString(), userId }, {
        jobId: dest._id.toString(),
        ...(delayMs > 0 ? { delay: delayMs } : {}),
    })));
    return {
        post: toPublicPost(post),
        destinations: destinations.map(toPublicDestination),
        usedTemporaryUrl,
    };
}
export async function createPostsBatch(userId, input) {
    const uniqueMediaIds = [...new Set(input.mediaIds)];
    if (uniqueMediaIds.length === 0) {
        throw new AppError('At least one media id is required', 400, 'VALIDATION_ERROR');
    }
    if (uniqueMediaIds.length > 20) {
        throw new AppError('Maximum 20 videos per batch', 400, 'BATCH_TOO_LARGE');
    }
    for (const id of uniqueMediaIds) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError(`Invalid media id: ${id}`, 400, 'INVALID_MEDIA_ID');
        }
    }
    // Validate all videos exist + ready before creating any posts
    const videos = await MediaAsset.find({
        _id: { $in: uniqueMediaIds },
        userId,
        type: 'video',
        status: 'ready',
    });
    if (videos.length !== uniqueMediaIds.length) {
        throw new AppError('One or more ready videos were not found', 404, 'MEDIA_NOT_FOUND');
    }
    if (input.thumbnailMediaId) {
        if (!Types.ObjectId.isValid(input.thumbnailMediaId)) {
            throw new AppError('Invalid thumbnail media id', 400, 'INVALID_THUMBNAIL_MEDIA_ID');
        }
        const thumb = await MediaAsset.findOne({
            _id: input.thumbnailMediaId,
            userId,
            type: { $in: ['image', 'thumbnail'] },
            status: 'ready',
        });
        if (!thumb) {
            throw new AppError('Ready thumbnail image not found', 404, 'THUMBNAIL_NOT_FOUND');
        }
    }
    const results = [];
    for (const mediaId of uniqueMediaIds) {
        const created = await createPost(userId, {
            mediaId,
            socialAccountIds: input.socialAccountIds,
            caption: input.caption,
            instagramCaption: input.instagramCaption,
            thumbnailMediaId: input.thumbnailMediaId,
            scheduledAt: input.scheduledAt,
            timezone: input.timezone,
            options: input.options,
        });
        results.push(created);
    }
    return {
        posts: results.map((r) => r.post),
        total: results.length,
        queuedDestinations: results.reduce((sum, r) => sum + r.destinations.length, 0),
        usedTemporaryUrl: results.some((r) => r.usedTemporaryUrl),
    };
}
export async function listPosts(userId, options = {}) {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const filter = { userId };
    if (options.status) {
        filter.status = options.status;
    }
    if (options.from && options.to) {
        const from = new Date(options.from);
        const to = new Date(options.to);
        filter.$expr = {
            $and: [
                { $gte: [{ $ifNull: ['$scheduledAt', '$createdAt'] }, from] },
                { $lt: [{ $ifNull: ['$scheduledAt', '$createdAt'] }, to] },
            ],
        };
    }
    const [posts, total] = await Promise.all([
        Post.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
        Post.countDocuments(filter),
    ]);
    const mapped = posts.map(toPublicPost);
    if (options.from && options.to) {
        mapped.sort((a, b) => {
            const aTime = (a.scheduledAt ?? a.createdAt).getTime();
            const bTime = (b.scheduledAt ?? b.createdAt).getTime();
            return aTime - bTime;
        });
    }
    return {
        posts: mapped,
        total,
        limit,
        offset,
    };
}
export async function getPostById(userId, postId) {
    if (!Types.ObjectId.isValid(postId)) {
        throw new AppError('Invalid post id', 400, 'INVALID_POST_ID');
    }
    const post = await Post.findOne({ _id: postId, userId });
    if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }
    const destinations = await PostDestination.find({ postId: post._id }).sort({ createdAt: 1 });
    return {
        post: toPublicPost(post),
        destinations: destinations.map(toPublicDestination),
    };
}
const CANCELLABLE_STATUSES = new Set(['pending', 'queued']);
export async function cancelPost(userId, postId) {
    if (!Types.ObjectId.isValid(postId)) {
        throw new AppError('Invalid post id', 400, 'INVALID_POST_ID');
    }
    const post = await Post.findOne({ _id: postId, userId });
    if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }
    const destinations = await PostDestination.find({ postId: post._id });
    const cancellable = destinations.filter((d) => CANCELLABLE_STATUSES.has(d.status));
    if (cancellable.length === 0) {
        throw new AppError('No destinations can be cancelled — all are already published or failed', 400, 'POST_NOT_CANCELLABLE');
    }
    // Remove delayed BullMQ jobs
    const queue = getPublishDestinationQueue();
    await Promise.all(cancellable.map(async (dest) => {
        try {
            const job = await queue.getJob(dest._id.toString());
            if (job)
                await job.remove();
        }
        catch {
            // Job may already be picked up — that's fine
        }
    }));
    // Update destination statuses
    await PostDestination.updateMany({
        _id: { $in: cancellable.map((d) => d._id) },
    }, { $set: { status: 'cancelled' } });
    const updatedPost = await syncPostFromDestinations(post._id);
    const updatedDestinations = await PostDestination.find({ postId: post._id }).sort({ createdAt: 1 });
    return {
        post: toPublicPost(updatedPost),
        destinations: updatedDestinations.map(toPublicDestination),
    };
}
const RETRIABLE_STATUSES = new Set(['failed']);
export async function retryPost(userId, postId, destinationIds) {
    if (!Types.ObjectId.isValid(postId)) {
        throw new AppError('Invalid post id', 400, 'INVALID_POST_ID');
    }
    if (destinationIds?.some((id) => !Types.ObjectId.isValid(id))) {
        throw new AppError('Invalid destination id', 400, 'INVALID_DESTINATION_ID');
    }
    const post = await Post.findOne({ _id: postId, userId });
    if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }
    const destinations = await PostDestination.find({ postId: post._id });
    let toRetry = destinations.filter((d) => RETRIABLE_STATUSES.has(d.status));
    if (destinationIds && destinationIds.length > 0) {
        const idSet = new Set(destinationIds);
        toRetry = toRetry.filter((d) => idSet.has(d._id.toString()));
    }
    if (toRetry.length === 0) {
        throw new AppError('No failed destinations to retry', 400, 'NO_DESTINATIONS_TO_RETRY');
    }
    const queue = getPublishDestinationQueue();
    await Promise.all(toRetry.map(async (dest) => {
        try {
            const existingJob = await queue.getJob(dest._id.toString());
            if (existingJob)
                await existingJob.remove();
        }
        catch {
            // Job may not exist — fine
        }
        await PostDestination.updateOne({ _id: dest._id }, {
            $set: {
                status: 'queued',
                attempts: 0,
                lastError: undefined,
                lastErrorCode: undefined,
            },
        });
        await queue.add('publish', { destinationId: dest._id.toString(), userId }, { jobId: dest._id.toString() });
    }));
    const updatedPost = await syncPostFromDestinations(post._id);
    const updatedDestinations = await PostDestination.find({ postId: post._id }).sort({ createdAt: 1 });
    return {
        post: toPublicPost(updatedPost),
        destinations: updatedDestinations.map(toPublicDestination),
        retriedCount: toRetry.length,
    };
}
//# sourceMappingURL=post.service.js.map