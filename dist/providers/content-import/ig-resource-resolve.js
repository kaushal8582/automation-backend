import axios from 'axios';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/error-handler.js';
import { createLogger } from '../../utils/logger.js';
const logger = createLogger('ig-resource-resolve');
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
function getIgAuth() {
    const auth = env.IG_AUTH ?? env.VIDSSAVE_AUTH;
    if (!auth) {
        throw new AppError('Instagram public link import is not configured. Set IG_AUTH on the server.', 503, 'INSTAGRAM_PROVIDER_UNAVAILABLE');
    }
    return auth;
}
function providerHeaders() {
    return {
        'content-type': 'application/x-www-form-urlencoded',
        origin: env.IG_ORIGIN,
        referer: `${env.IG_ORIGIN}/`,
        'user-agent': BROWSER_UA,
        accept: 'application/json, text/plain, */*',
    };
}
function downloadUrlEndpoint() {
    return env.IG_PARSE_URL.replace(/\/media\/parse\/?$/, '/media/download_url');
}
function downloadProgressEndpoint() {
    return env.IG_PARSE_URL.replace(/\/media\/parse\/?$/, '/media/download_progress');
}
function gatewayStreamUrl(requestToken) {
    const base = env.IG_DOMAIN.startsWith('http')
        ? env.IG_DOMAIN
        : `https://${env.IG_DOMAIN}`;
    return `${base}/api/gateway/proxy/stream?request=${encodeURIComponent(requestToken)}`;
}
function extractHttpUrl(payload) {
    if (!payload || typeof payload !== 'object')
        return undefined;
    const data = payload;
    const nested = data.data && typeof data.data === 'object'
        ? data.data
        : undefined;
    const candidates = [
        nested?.download_url,
        nested?.url,
        nested?.preview_url,
        nested?.file,
        nested?.link,
        data.download_url,
        data.url,
        data.preview_url,
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && /^https?:\/\//i.test(c.trim()))
            return c.trim();
    }
    return undefined;
}
function extractTaskId(payload) {
    if (!payload || typeof payload !== 'object')
        return undefined;
    const data = payload;
    const nested = data.data && typeof data.data === 'object'
        ? data.data
        : undefined;
    const candidates = [nested?.task_id, nested?.taskId, nested?.request, data.task_id, data.taskId];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim())
            return c.trim();
    }
    return undefined;
}
/**
 * Gateway preview tokens (from parse) typically start with a long opaque string.
 * Async download tasks return a different task_id that is NOT a valid stream token
 * until progress returns a real URL — never treat raw task_id as downloadable.
 */
async function pollDownloadProgress(params) {
    const auth = getIgAuth();
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 1500));
        }
        try {
            const body = new URLSearchParams({
                auth,
                domain: env.IG_DOMAIN,
                task_id: params.taskId,
                resource_id: params.resourceId,
                resource_content: params.resourceContent,
                format: params.format,
                type: params.type,
            });
            const { data } = await axios.post(downloadProgressEndpoint(), body.toString(), {
                timeout: 20_000,
                headers: providerHeaders(),
                validateStatus: () => true,
            });
            const url = extractHttpUrl(data);
            if (url)
                return url;
            // Some providers eventually return a streamable request token (same shape as preview_url).
            const maybeToken = extractTaskId(data);
            if (maybeToken &&
                maybeToken !== params.taskId &&
                maybeToken.length > 80 &&
                !maybeToken.includes('==')) {
                return gatewayStreamUrl(maybeToken);
            }
        }
        catch (error) {
            logger.warn('IG download_progress poll failed', {
                attempt,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    return undefined;
}
/**
 * Some IG resources (especially audio) return empty download_url and only
 * resource_content. Resolve them via the provider download_url + progress APIs.
 */
export async function resolveProviderDownloadUrl(raw) {
    const direct = (typeof raw.download_url === 'string' && raw.download_url) ||
        (typeof raw.downloadUrl === 'string' && raw.downloadUrl) ||
        (typeof raw.preview_url === 'string' && raw.preview_url) ||
        (typeof raw.previewUrl === 'string' && raw.previewUrl) ||
        undefined;
    if (direct && /^https?:\/\//i.test(direct)) {
        return direct;
    }
    const resourceContent = typeof raw.resource_content === 'string' ? raw.resource_content : undefined;
    if (!resourceContent)
        return undefined;
    const auth = getIgAuth();
    const format = String(raw.format ?? raw.original_format ?? 'MP3');
    const type = String(raw.type ?? 'audio');
    const resourceId = String(raw.resource_id ?? raw.id ?? '');
    const body = new URLSearchParams({
        auth,
        domain: env.IG_DOMAIN,
        resource_content: resourceContent,
        format,
        type,
        resource_id: resourceId,
        download_mode: String(raw.download_mode ?? raw.downloadMode ?? ''),
    });
    try {
        const { data } = await axios.post(downloadUrlEndpoint(), body.toString(), {
            timeout: 30_000,
            headers: providerHeaders(),
        });
        const immediate = extractHttpUrl(data);
        if (immediate)
            return immediate;
        const taskId = extractTaskId(data);
        if (!taskId)
            return undefined;
        logger.info('IG download_url returned task; polling progress', {
            type: raw.type,
            format: raw.format,
        });
        const polled = await pollDownloadProgress({
            taskId,
            resourceId,
            resourceContent,
            format,
            type,
        });
        if (polled) {
            logger.info('Resolved IG resource via download_progress', {
                type: raw.type,
                format: raw.format,
            });
            return polled;
        }
        logger.warn('IG download task did not yield a downloadable URL', {
            type: raw.type,
            format: raw.format,
        });
    }
    catch (error) {
        logger.warn('Failed to resolve IG resource_content download URL', {
            type: raw.type,
            error: error instanceof Error ? error.message : String(error),
        });
    }
    return undefined;
}
export async function ensureResourceDownloadUrl(resource, rawHint) {
    if (resource.downloadUrl && /^https?:\/\//i.test(resource.downloadUrl)) {
        return resource;
    }
    if (!rawHint)
        return resource;
    const resolved = await resolveProviderDownloadUrl(rawHint);
    if (!resolved)
        return resource;
    return { ...resource, downloadUrl: resolved };
}
//# sourceMappingURL=ig-resource-resolve.js.map