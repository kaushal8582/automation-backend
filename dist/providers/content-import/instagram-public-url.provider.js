import axios from 'axios';
import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { getRedis } from '../../config/redis.js';
import { AppError } from '../../middlewares/error-handler.js';
import { createLogger } from '../../utils/logger.js';
import { assertInstagramMediaUrl, isInstagramMediaUrl, parseInstagramMediaUrl, } from './instagram-permalink.js';
const logger = createLogger('instagram-public-url');
const PREVIEW_CACHE_TTL_SECONDS = 60 * 60;
const PREVIEW_CACHE_PREFIX = 'instagram-import-preview:v6:';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
function getIgAuth() {
    const auth = env.IG_AUTH ?? env.VIDSSAVE_AUTH;
    if (!auth) {
        throw new AppError('Instagram public link import is not configured. Set IG_AUTH on the server.', 503, 'INSTAGRAM_PROVIDER_UNAVAILABLE');
    }
    return auth;
}
function mapProviderError(error) {
    if (error instanceof AppError)
        throw error;
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 429) {
            throw new AppError('Instagram download provider rate-limited this request. Try again shortly.', 429, 'INSTAGRAM_PROVIDER_RATE_LIMIT');
        }
        if (status && status >= 500) {
            throw new AppError('Instagram download provider is temporarily unavailable.', 502, 'INSTAGRAM_PROVIDER_UNAVAILABLE');
        }
        const message = (typeof error.response?.data === 'object' &&
            error.response.data &&
            'message' in error.response.data &&
            typeof error.response.data.message === 'string'
            ? error.response.data.message
            : undefined) ||
            error.message ||
            'Failed to parse Instagram media';
        throw new AppError(message, 502, 'INSTAGRAM_PARSE_FAILED');
    }
    throw new AppError(error instanceof Error ? error.message : 'Failed to parse Instagram media', 502, 'INSTAGRAM_PARSE_FAILED');
}
function hasParsePayload(payload) {
    if (!payload?.data)
        return false;
    const statusFalse = payload.status === false || payload.status === 'false' || payload.status === 0;
    if (statusFalse)
        return false;
    if (typeof payload.status_code === 'number' && payload.status_code >= 400)
        return false;
    const data = payload.data;
    const hasMedia = Array.isArray(data.media) && data.media.length > 0;
    const hasResources = Array.isArray(data.resources) && data.resources.length > 0;
    return hasMedia || hasResources || Boolean(data.thumbnail || data.thumb || data.title);
}
function pickDownloadUrl(raw) {
    const candidates = [
        raw.download_url,
        raw.downloadUrl,
        raw.preview_url,
        raw.previewUrl,
        raw.url,
        raw.link,
        raw.src,
        raw.file,
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && /^https?:\/\//i.test(c.trim()))
            return c.trim();
    }
    return '';
}
function normalizeResourceType(rawType, format, quality = '') {
    const type = String(rawType ?? '').toLowerCase();
    const fmt = format.toUpperCase();
    const q = quality.toLowerCase();
    if (type.includes('audio') ||
        fmt === 'MP3' ||
        fmt === 'M4A' ||
        fmt === 'AAC' ||
        fmt === 'WAV' ||
        q.includes('audio') ||
        q.includes('sound') ||
        q.includes('music')) {
        return 'audio';
    }
    if (type.includes('image') || type.includes('photo') || ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(fmt)) {
        return 'image';
    }
    return 'video';
}
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
function stableResourceId(downloadUrl, index, quality, type) {
    const hash = createHash('sha1').update(`${downloadUrl}|${quality}|${type}|${index}`).digest('hex').slice(0, 16);
    return `ig-${hash}`;
}
function normalizeOneResource(raw, index, labelHint) {
    const rec = asRecord(raw);
    if (!rec)
        return null;
    let downloadUrl = pickDownloadUrl(rec);
    const resourceContent = typeof rec.resource_content === 'string' ? rec.resource_content.trim() : '';
    // Audio often has empty download_url and only resource_content — keep it for later resolve.
    if (!downloadUrl && !resourceContent)
        return null;
    if (!downloadUrl && resourceContent) {
        downloadUrl = `pending:resource_content:${resourceContent.slice(0, 32)}:${index}`;
    }
    const format = String(rec.format ?? rec.extension ?? rec.ext ?? 'MP4').toUpperCase().replace(/^\./, '');
    const qualityRaw = (typeof rec.quality === 'string' && rec.quality.trim()) ||
        (typeof rec.label === 'string' && rec.label.trim()) ||
        labelHint ||
        '';
    const type = normalizeResourceType(rec.type ?? rec.media_type, format, qualityRaw);
    const quality = qualityRaw ||
        (type === 'image' ? 'Photo' : type === 'audio' ? 'Audio' : 'Original');
    const sizeRaw = rec.size ?? rec.filesize ?? rec.file_size ?? 0;
    const size = typeof sizeRaw === 'number' ? sizeRaw : Number(sizeRaw) || 0;
    const id = (typeof rec.id === 'string' && rec.id.trim()) ||
        (typeof rec.resource_id === 'string' && rec.resource_id.trim()) ||
        stableResourceId(downloadUrl, index, quality, type);
    return {
        id,
        type,
        format,
        quality,
        size,
        downloadUrl,
        downloadMode: (typeof rec.downloadMode === 'string' && rec.downloadMode) ||
            (typeof rec.download_mode === 'string' && rec.download_mode) ||
            undefined,
        resourceContent: resourceContent || undefined,
    };
}
function collectDownloadResources(data) {
    const collected = [];
    const seen = new Set();
    const push = (resource) => {
        if (!resource)
            return;
        // pending: placeholders are unique per resource_content; real URLs dedupe later
        if (!resource.downloadUrl.startsWith('pending:') && seen.has(resource.downloadUrl))
            return;
        if (!resource.downloadUrl.startsWith('pending:'))
            seen.add(resource.downloadUrl);
        collected.push(resource);
    };
    const mediaNodes = Array.isArray(data.media) ? data.media : [];
    if (mediaNodes.length > 0) {
        const total = mediaNodes.length;
        mediaNodes.forEach((node, mediaIndex) => {
            const nested = Array.isArray(node.resources) ? node.resources : [];
            if (nested.length > 0) {
                nested.forEach((raw, resIndex) => {
                    const hint = total > 1
                        ? `${mediaIndex + 1}/${total} ${String(asRecord(raw)?.type || 'Media')}`
                        : undefined;
                    push(normalizeOneResource(raw, collected.length + resIndex, hint));
                });
                return;
            }
            const thumb = typeof node.thumbnail === 'string'
                ? node.thumbnail
                : typeof node.thumb === 'string'
                    ? node.thumb
                    : '';
            if (thumb) {
                push(normalizeOneResource({
                    type: 'image',
                    format: 'JPG',
                    quality: total > 1 ? `${mediaIndex + 1}/${total} Photo` : 'Photo',
                    download_url: thumb,
                }, collected.length));
            }
        });
    }
    // IMPORTANT: always merge top-level resources too.
    // IG provider puts companion audio (MP3/M4A) on data.resources while
    // video qualities live under data.media[].resources.
    if (Array.isArray(data.resources)) {
        data.resources.forEach((raw, index) => push(normalizeOneResource(raw, collected.length + index)));
    }
    return collected;
}
function parseDurationSeconds(data) {
    const direct = data.durationSeconds ?? data.duration_seconds;
    if (typeof direct === 'number' && Number.isFinite(direct))
        return Math.max(0, Math.round(direct));
    if (typeof data.duration === 'number' && Number.isFinite(data.duration)) {
        return Math.max(0, Math.round(data.duration));
    }
    if (typeof data.duration === 'string') {
        const parts = data.duration.split(':').map((p) => Number(p));
        if (parts.every((n) => Number.isFinite(n))) {
            if (parts.length === 3)
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2)
                return parts[0] * 60 + parts[1];
            if (parts.length === 1)
                return parts[0];
        }
    }
    return undefined;
}
function formatDuration(seconds) {
    if (seconds === undefined || !Number.isFinite(seconds))
        return undefined;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}
async function callProvider(link, origin) {
    const body = new URLSearchParams({
        auth: getIgAuth(),
        domain: env.IG_DOMAIN,
        origin,
        link,
    });
    const { data } = await axios.post(env.IG_PARSE_URL, body.toString(), {
        timeout: 45_000,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            origin: env.IG_ORIGIN,
            referer: `${env.IG_ORIGIN}/`,
            'user-agent': BROWSER_UA,
            accept: 'application/json, text/plain, */*',
        },
        validateStatus: (status) => status >= 200 && status < 500,
    });
    return data ?? {};
}
export class InstagramPublicUrlImportProvider {
    platform = 'instagram';
    canHandle(url) {
        return isInstagramMediaUrl(url);
    }
    async parse(url) {
        const parsed = assertInstagramMediaUrl(url);
        // Include share-token signature so stkn/igsh variants are not served from a silent cache entry.
        const cacheKey = `${PREVIEW_CACHE_PREFIX}${parsed.shortcode}:${parsed.providerUrl === parsed.normalizedUrl ? 'plain' : 'tok'}`;
        try {
            const cached = await getRedis().get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        catch {
            // Redis miss / unavailable — continue without cache
        }
        let payload = null;
        let lastError;
        // Instagram provider order: source → cache (matches working downloader)
        for (const origin of ['source', 'cache']) {
            try {
                const result = await callProvider(parsed.providerUrl, origin);
                if (hasParsePayload(result)) {
                    payload = result;
                    break;
                }
                if (result?.message) {
                    lastError = new AppError(String(result.message), 502, 'INSTAGRAM_PARSE_FAILED');
                }
            }
            catch (error) {
                lastError = error;
                logger.warn('Instagram public parse attempt failed', {
                    shortcode: parsed.shortcode,
                    origin,
                    code: error instanceof AppError ? error.code : undefined,
                });
            }
        }
        if (!payload?.data) {
            mapProviderError(lastError ?? new AppError('Instagram media not found', 404, 'INSTAGRAM_MEDIA_NOT_FOUND'));
        }
        const data = payload.data;
        const collected = collectDownloadResources(data);
        // Do not block preview on slow audio task polling — keep pending audio and resolve at import time.
        const resources = collected.filter((r) => Boolean(r.downloadUrl) || Boolean(r.resourceContent));
        if (resources.length === 0) {
            throw new AppError('No downloadable media found for this Instagram URL.', 404, 'INSTAGRAM_MEDIA_NOT_FOUND');
        }
        const durationSeconds = parseDurationSeconds(data);
        const title = (typeof data.title === 'string' && data.title.trim()) ||
            (typeof data.caption === 'string' && data.caption.trim()) ||
            `Instagram ${parsed.kind} ${parsed.shortcode}`;
        const caption = (typeof data.caption === 'string' && data.caption.trim()) ||
            (typeof data.title === 'string' && data.title.trim()) ||
            '';
        const thumbnail = (typeof data.thumbnail === 'string' && data.thumbnail) ||
            (typeof data.thumb === 'string' && data.thumb) ||
            resources.find((r) => r.type === 'image')?.downloadUrl;
        const result = {
            sourceUrl: parsed.normalizedUrl,
            sourcePlatform: 'instagram',
            externalId: parsed.shortcode,
            title,
            caption,
            thumbnail,
            duration: formatDuration(durationSeconds) ?? (typeof data.duration === 'string' ? data.duration : undefined),
            durationSeconds,
            resources,
        };
        try {
            await getRedis().set(cacheKey, JSON.stringify(result), 'EX', PREVIEW_CACHE_TTL_SECONDS);
        }
        catch {
            // ignore cache write failures
        }
        logger.info('Instagram public URL parsed', {
            shortcode: parsed.shortcode,
            resourceCount: resources.length,
        });
        return result;
    }
    /**
     * Re-parse and resolve selected resource IDs server-side (never trust client download URLs).
     */
    async resolveResources(url, resourceIds) {
        const parsed = await this.parse(url);
        const byId = new Map(parsed.resources.map((r) => [r.id, r]));
        const selected = [];
        for (const id of resourceIds) {
            const resource = byId.get(id);
            if (!resource) {
                throw new AppError(`Selected resource was not found. Preview may have expired — please preview again.`, 400, 'INSTAGRAM_DOWNLOAD_EXPIRED', { resourceId: id });
            }
            selected.push(resource);
        }
        return { parsed, selected };
    }
}
export const instagramPublicUrlImportProvider = new InstagramPublicUrlImportProvider();
export function getPublicUrlImportProvider(url) {
    if (instagramPublicUrlImportProvider.canHandle(url)) {
        return instagramPublicUrlImportProvider;
    }
    return null;
}
/** Validate Instagram public URL or throw INVALID_INSTAGRAM_URL */
export function assertValidInstagramPublicUrl(url) {
    const parsed = parseInstagramMediaUrl(url);
    if (!parsed) {
        throw new AppError('Invalid Instagram URL. Use a reel, post, or IGTV link.', 400, 'INVALID_INSTAGRAM_URL');
    }
    return parsed;
}
//# sourceMappingURL=instagram-public-url.provider.js.map