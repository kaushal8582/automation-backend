import { AppError } from '../../middlewares/error-handler.js';
import { createInstagramGraphClient } from '../meta/meta-client.js';
import { normalizeMetaError } from '../meta/meta-errors.js';
import { CONTENT_IMPORT_DEFAULT_PAGE_SIZE } from '../../constants/content-import.js';
/** Graph API page size cap for internal scans (public HTTP API still validates limit≤10). */
const IG_LIST_MAX_LIMIT = 50;
function mapIgMediaType(node) {
    const product = (node.media_product_type ?? '').toUpperCase();
    const type = (node.media_type ?? '').toUpperCase();
    if (product === 'REELS' || type === 'REELS')
        return 'reel';
    if (type === 'VIDEO')
        return 'video';
    if (type === 'IMAGE')
        return 'image';
    if (type === 'CAROUSEL_ALBUM')
        return 'carousel';
    return type.toLowerCase() || 'unknown';
}
function toExternalItem(node, accountId) {
    return {
        externalId: node.id,
        platform: 'instagram',
        accountId,
        mediaType: mapIgMediaType(node),
        thumbnailUrl: node.thumbnail_url ?? (mapIgMediaType(node) === 'image' ? node.media_url : undefined),
        sourceUrl: node.media_url,
        caption: node.caption,
        createdAt: node.timestamp,
        permalink: node.permalink,
        metadata: {
            media_type: node.media_type,
            media_product_type: node.media_product_type,
        },
    };
}
function mapImportError(error) {
    const normalized = normalizeMetaError(error);
    if (normalized.code === 'META_TOKEN_EXPIRED') {
        throw new AppError(normalized.message, 401, 'IMPORT_TOKEN_EXPIRED', normalized.details);
    }
    if (normalized.code === 'META_PERMISSION_DENIED') {
        throw new AppError(normalized.message, 403, 'IMPORT_PERMISSION_REQUIRED', normalized.details);
    }
    if (normalized.code === 'META_RATE_LIMIT') {
        throw new AppError(normalized.message, 429, 'IMPORT_RATE_LIMITED', normalized.details);
    }
    throw new AppError(normalized.message, normalized.statusCode, 'IMPORT_PLATFORM_ERROR', normalized.details);
}
/**
 * Lists / resolves media from a connected Instagram account via the official Graph API.
 * Uses only fields the API returns — does not scrape or invent URLs.
 */
export class InstagramImportProvider {
    platform = 'instagram';
    client;
    constructor(client) {
        this.client = client ?? createInstagramGraphClient();
    }
    async listMedia(input) {
        const limit = Math.min(Math.max(input.limit ?? CONTENT_IMPORT_DEFAULT_PAGE_SIZE, 1), IG_LIST_MAX_LIMIT);
        try {
            const { data } = await this.client.get(`/${input.platformAccountId}/media`, {
                params: {
                    fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp',
                    limit,
                    ...(input.cursor ? { after: input.cursor } : {}),
                    access_token: input.accessToken,
                },
            });
            const items = (data.data ?? []).map((node) => toExternalItem(node, input.socialAccountId));
            const nextCursor = data.paging?.cursors?.after;
            return { items, nextCursor: nextCursor || undefined };
        }
        catch (error) {
            mapImportError(error);
        }
    }
    async getMediaDetails(input) {
        try {
            const { data } = await this.client.get(`/${input.externalId}`, {
                params: {
                    fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp',
                    access_token: input.accessToken,
                },
            });
            if (!data?.id) {
                throw new AppError('Media not found', 404, 'IMPORT_MEDIA_NOT_FOUND');
            }
            return toExternalItem(data, input.socialAccountId);
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            mapImportError(error);
        }
    }
    async resolveMediaSource(input) {
        const item = input.item ?? (await this.getMediaDetails(input));
        if (!item.sourceUrl) {
            throw new AppError('Instagram did not return a downloadable media URL for this item. It may be expired or unsupported.', 404, 'IMPORT_MEDIA_NOT_FOUND');
        }
        const mediaType = String(item.mediaType).toLowerCase();
        const isVideo = mediaType === 'video' || mediaType === 'reel';
        const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
        const ext = isVideo ? 'mp4' : 'jpg';
        return {
            directUrl: item.sourceUrl,
            mimeType,
            filename: `instagram-${item.externalId}.${ext}`,
            thumbnailUrl: item.thumbnailUrl,
        };
    }
}
//# sourceMappingURL=instagram-import.provider.js.map