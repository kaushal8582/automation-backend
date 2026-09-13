import { AppError } from '../../middlewares/error-handler.js';
import { createFacebookGraphClient } from '../meta/meta-client.js';
import { normalizeMetaError } from '../meta/meta-errors.js';
import { CONTENT_IMPORT_DEFAULT_PAGE_SIZE } from '../../constants/content-import.js';
function toExternalItem(node, accountId) {
    return {
        externalId: node.id,
        platform: 'facebook',
        accountId,
        mediaType: 'video',
        thumbnailUrl: node.picture,
        sourceUrl: node.source,
        caption: node.description,
        createdAt: node.created_time,
        duration: typeof node.length === 'number' ? node.length : undefined,
        permalink: node.permalink_url,
        metadata: {
            length: node.length,
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
 * Lists / resolves videos from a connected Facebook Page via the official Graph API.
 * Requires existing page token permissions (e.g. pages_read_engagement).
 */
export class FacebookImportProvider {
    platform = 'facebook';
    client;
    constructor(client) {
        this.client = client ?? createFacebookGraphClient();
    }
    async listMedia(input) {
        const limit = Math.min(Math.max(input.limit ?? CONTENT_IMPORT_DEFAULT_PAGE_SIZE, 1), CONTENT_IMPORT_DEFAULT_PAGE_SIZE);
        try {
            const { data } = await this.client.get(`/${input.platformAccountId}/videos`, {
                params: {
                    fields: 'id,description,source,picture,created_time,length,permalink_url',
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
                    fields: 'id,description,source,picture,created_time,length,permalink_url',
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
            throw new AppError('Facebook did not return a downloadable video source URL. Reconnect the page or check permissions.', 404, 'IMPORT_MEDIA_NOT_FOUND');
        }
        return {
            directUrl: item.sourceUrl,
            mimeType: 'video/mp4',
            filename: `facebook-${item.externalId}.mp4`,
            thumbnailUrl: item.thumbnailUrl,
        };
    }
}
//# sourceMappingURL=facebook-import.provider.js.map