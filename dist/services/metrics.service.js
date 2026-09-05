import { Types } from 'mongoose';
import { AppError } from '../middlewares/error-handler.js';
import { Post } from '../models/post.model.js';
import { PostDestination } from '../models/post-destination.model.js';
import { SocialPostMetrics } from '../models/social-post-metrics.model.js';
import { SocialAccount } from '../models/social-account.model.js';
import { createInstagramGraphClient } from '../providers/meta/meta-client.js';
import { createFacebookGraphClient } from '../providers/meta/meta-client.js';
import { normalizeMetaError } from '../providers/meta/meta-errors.js';
import { metaTokenService } from './meta-token.service.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('metrics-service');
/* ─── Raw API fetch helpers ───────────────────────────────────────────────── */
async function fetchInstagramMetrics(platformPostId, accessToken) {
    const client = createInstagramGraphClient();
    try {
        const { data } = await client.get(`/${platformPostId}`, {
            params: {
                fields: 'like_count,comments_count,media_product_type,insights.metric(reach,video_views)',
                access_token: accessToken,
            },
        });
        const insights = data.insights?.data ?? [];
        const getInsight = (name) => insights.find((i) => i.name === name)?.values?.[0]?.value;
        return {
            likes: typeof data.like_count === 'number' ? data.like_count : undefined,
            comments: typeof data.comments_count === 'number' ? data.comments_count : undefined,
            views: getInsight('video_views'),
            reach: getInsight('reach'),
            raw: data,
        };
    }
    catch (error) {
        throw normalizeMetaError(error);
    }
}
async function fetchFacebookMetrics(platformPostId, accessToken) {
    const client = createFacebookGraphClient();
    try {
        const { data } = await client.get(`/${platformPostId}`, {
            params: {
                // Video insights
                fields: 'likes.summary(true),comments.summary(true),shares,video_insights',
                access_token: accessToken,
            },
        });
        const likesObj = data.likes;
        const sharesObj = data.shares;
        const videoInsights = data.video_insights?.data ?? [];
        const getVI = (name) => videoInsights.find((n) => n.name === name)?.values?.[0]?.value;
        return {
            likes: likesObj?.summary?.total_count,
            comments: data.comments?.summary?.total_count,
            shares: sharesObj?.count,
            views: getVI('total_video_views'),
            reach: getVI('total_video_impressions_unique'),
            raw: data,
        };
    }
    catch (error) {
        throw normalizeMetaError(error);
    }
}
/* ─── Core: sync metrics for one destination ─────────────────────────────── */
export async function syncDestinationMetrics(destinationId, userId) {
    const destination = await PostDestination.findById(destinationId);
    if (!destination || destination.status !== 'published' || !destination.platformPostId) {
        logger.info('Skipping metrics sync — destination not published or no platformPostId', {
            destinationId,
        });
        return;
    }
    const account = await SocialAccount.findById(destination.socialAccountId);
    if (!account) {
        logger.warn('Account not found for metrics sync', { destinationId });
        return;
    }
    const accessToken = await metaTokenService.getDecryptedAccessToken(userId, account.id);
    let metrics;
    try {
        if (destination.platform === 'instagram') {
            metrics = await fetchInstagramMetrics(destination.platformPostId, accessToken);
        }
        else if (destination.platform === 'facebook') {
            metrics = await fetchFacebookMetrics(destination.platformPostId, accessToken);
        }
        else {
            logger.warn('Unsupported platform for metrics', { platform: destination.platform });
            return;
        }
    }
    catch (error) {
        logger.error('Failed to fetch metrics from Meta', {
            destinationId,
            error: error instanceof Error ? error.message : String(error),
        });
        // Non-fatal — we'll retry on next scheduled sync
        return;
    }
    await SocialPostMetrics.findOneAndUpdate({ destinationId: destination._id }, {
        $set: {
            userId: new Types.ObjectId(userId),
            postId: destination.postId,
            destinationId: destination._id,
            socialAccountId: destination.socialAccountId,
            platform: destination.platform,
            platformPostId: destination.platformPostId,
            views: metrics.views,
            likes: metrics.likes,
            comments: metrics.comments,
            reach: metrics.reach,
            shares: metrics.shares,
            fetchedAt: new Date(),
            raw: metrics.raw,
        },
    }, { upsert: true, new: true });
    logger.info('Metrics synced', { destinationId, platform: destination.platform });
}
/* ─── Sync all published destinations for a post ─────────────────────────── */
export async function syncPostMetrics(postId, userId) {
    const destinations = await PostDestination.find({
        postId: new Types.ObjectId(postId),
        status: 'published',
        platformPostId: { $exists: true, $ne: null },
    });
    await Promise.allSettled(destinations.map((d) => syncDestinationMetrics(d._id.toString(), userId)));
}
/* ─── Batch sync: all posts published in the last N days ─────────────────── */
export async function syncRecentMetrics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPosts = await Post.find({
        status: { $in: ['published', 'partially_published'] },
        updatedAt: { $gte: thirtyDaysAgo },
    }).select('_id userId');
    logger.info(`Syncing metrics for ${recentPosts.length} recent posts`);
    for (const post of recentPosts) {
        await syncPostMetrics(post._id.toString(), post.userId.toString());
    }
}
/* ─── Get stored metrics for a post (API response) ───────────────────────── */
export async function getPostMetrics(userId, postId) {
    if (!Types.ObjectId.isValid(postId)) {
        throw new AppError('Invalid post id', 400, 'INVALID_POST_ID');
    }
    // Verify ownership
    const post = await Post.findOne({ _id: postId, userId });
    if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }
    const records = await SocialPostMetrics.find({ postId: new Types.ObjectId(postId) }).sort({
        fetchedAt: -1,
    });
    return records.map((m) => ({
        id: m._id.toString(),
        destinationId: m.destinationId.toString(),
        platform: m.platform,
        platformPostId: m.platformPostId,
        views: m.views,
        likes: m.likes,
        comments: m.comments,
        reach: m.reach,
        shares: m.shares,
        fetchedAt: m.fetchedAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
    }));
}
//# sourceMappingURL=metrics.service.js.map