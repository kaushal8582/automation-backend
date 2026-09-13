import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { Types } from 'mongoose';
import { buildPublicUrl, getR2Bucket, getR2Client, isR2ConfiguredForRealUploads, resolveAccessibleMediaUrl, } from '../config/r2.js';
import { env } from '../config/env.js';
import { CONTENT_IMPORT_DEFAULT_PAGE_SIZE, CONTENT_IMPORT_MAX_BATCH, INSTAGRAM_PUBLIC_IMPORT_MAX_RESOURCES, } from '../constants/content-import.js';
import { ALLOWED_IMAGE_MIME_TYPES, ALLOWED_MEDIA_MIME_TYPES, ALLOWED_VIDEO_MIME_TYPES, } from '../constants/media.js';
import { AppError } from '../middlewares/error-handler.js';
import { ContentImportJob, } from '../models/content-import-job.model.js';
import { MediaAsset } from '../models/media-asset.model.js';
import { SocialAccount } from '../models/social-account.model.js';
import { getContentImportProvider, listImportablePlatforms } from '../providers/content-import/index.js';
import { isInstagramMediaUrl } from '../providers/content-import/instagram-permalink.js';
import { assertValidInstagramPublicUrl, instagramPublicUrlImportProvider, } from '../providers/content-import/instagram-public-url.provider.js';
import { resolveOwnedInstagramPermalink } from '../providers/content-import/instagram-permalink-resolver.js';
import { rankVideoResource } from '../providers/content-import/ig-video-rank.js';
import { resolveProviderDownloadUrl } from '../providers/content-import/ig-resource-resolve.js';
import { findUrlImportAdapter } from '../providers/content-import/url-adapters.js';
import { createLogger } from '../utils/logger.js';
import { cleanupTempDir, createImportTempDir, fileHasAudioStream, muxVideoWithAudio, writeStreamToFile, } from '../utils/media-mux.js';
import { safeFetchMediaStream } from '../utils/safe-fetch.js';
import { assertAllowedMimeType, assertUploadSize, buildImportObjectKey, buildObjectKey, resolveMediaType, } from './media-validation.service.js';
import { metaTokenService } from './meta-token.service.js';
import { getContentImportQueue } from '../queues/content-import.queue.js';
const logger = createLogger('content-import');
function toPublicJob(job) {
    return {
        id: job._id.toString(),
        sourceType: job.sourceType,
        sourcePlatform: job.sourcePlatform,
        socialAccountId: job.socialAccountId?.toString(),
        externalId: job.externalId,
        sourceResourceId: job.sourceResourceId,
        sourceUrl: job.sourceUrl,
        status: job.status,
        progress: job.progress,
        mediaAssetId: job.mediaAssetId?.toString(),
        errorCode: job.errorCode,
        errorMessage: job.errorMessage,
        caption: job.caption,
        thumbnailUrl: job.thumbnailUrl,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
    };
}
async function toPublicMedia(media) {
    return {
        id: media._id.toString(),
        type: media.type,
        originalFilename: media.originalFilename,
        r2Key: media.r2Key,
        publicUrl: await resolveAccessibleMediaUrl(media.r2Key, media.publicUrl),
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        duration: media.duration,
        width: media.width,
        height: media.height,
        status: media.status,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
        sourceType: media.sourceType,
        sourcePlatform: media.sourcePlatform,
        sourceExternalId: media.sourceExternalId,
        sourceCaption: media.sourceCaption,
        sourcePostUrl: media.sourcePostUrl,
        importedAt: media.importedAt,
    };
}
function assertR2Ready() {
    if (!isR2ConfiguredForRealUploads()) {
        throw new AppError('Cloudflare R2 is not configured. Set R2_* environment variables.', 503, 'R2_NOT_CONFIGURED');
    }
}
function normalizeMimeType(raw, fallback) {
    const cleaned = (raw ?? '').split(';')[0]?.trim().toLowerCase();
    if (cleaned && ALLOWED_MEDIA_MIME_TYPES.includes(cleaned)) {
        return cleaned;
    }
    if (fallback)
        return fallback;
    throw new AppError('Unsupported media content type', 400, 'IMPORT_SOURCE_UNSUPPORTED', {
        contentType: raw,
    });
}
async function findExistingImport(userId, sourcePlatform, sourceExternalId) {
    return MediaAsset.findOne({
        userId,
        sourcePlatform,
        sourceExternalId,
        status: 'ready',
        $or: [{ sourceResourceId: { $exists: false } }, { sourceResourceId: null }, { sourceResourceId: '' }],
    });
}
async function findExistingResourceImport(userId, sourcePlatform, sourceExternalId, sourceResourceId) {
    return MediaAsset.findOne({
        userId,
        sourcePlatform,
        sourceExternalId,
        sourceResourceId,
        status: 'ready',
    });
}
function guessMimeFromResource(resource) {
    const format = resource.format.toUpperCase();
    if (resource.type === 'audio') {
        if (format === 'M4A' || format === 'MP4')
            return 'audio/mp4';
        if (format === 'AAC')
            return 'audio/aac';
        if (format === 'WAV')
            return 'audio/wav';
        return 'audio/mpeg';
    }
    if (resource.type === 'video' || format === 'MP4')
        return 'video/mp4';
    if (format === 'MOV')
        return 'video/quicktime';
    if (resource.type === 'image') {
        if (format === 'PNG')
            return 'image/png';
        if (format === 'WEBP')
            return 'image/webp';
        return 'image/jpeg';
    }
    return undefined;
}
function sanitizeImportFilename(title, resource) {
    const base = title
        .replace(/[^\w\s.-]/g, '')
        .trim()
        .slice(0, 80)
        .replace(/\s+/g, '-') || 'instagram';
    const ext = resource.format.toLowerCase().replace(/^\./, '') || (resource.type === 'image' ? 'jpg' : 'mp4');
    return `${base}-${resource.id.slice(0, 8)}.${ext}`;
}
function truncateField(value, max) {
    if (!value)
        return value;
    if (value.length <= max)
        return value;
    return value.slice(0, max - 1).trimEnd() + '…';
}
const IG_DOWNLOAD_HEADERS = {
    Referer: 'https://www.instagram.com/',
    Origin: 'https://www.instagram.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};
function downloadHeadersForUrl(url) {
    if (/igvideodownloader\.net/i.test(url)) {
        return {
            Referer: `${env.IG_ORIGIN}/`,
            Origin: env.IG_ORIGIN,
            'User-Agent': IG_DOWNLOAD_HEADERS['User-Agent'],
            Accept: '*/*',
        };
    }
    return IG_DOWNLOAD_HEADERS;
}
function pickCompanionAudio(resources, videoResourceId) {
    const audios = resources.filter((r) => r.type === 'audio' && r.id !== videoResourceId);
    if (audios.length === 0)
        return undefined;
    return [...audios].sort((a, b) => {
        const aOrig = /original/i.test(a.quality) ? 1 : 0;
        const bOrig = /original/i.test(b.quality) ? 1 : 0;
        if (aOrig !== bOrig)
            return bOrig - aOrig;
        return (b.size || 0) - (a.size || 0);
    })[0];
}
/** Prefer Original / non-ladder videos — ladder NxP streams are often silent. */
function alternateVideosWithLikelyAudio(resources, currentId) {
    const others = resources.filter((r) => r.type === 'video' && r.id !== currentId);
    return [...others].sort((a, b) => rankVideoResource(b) - rankVideoResource(a));
}
async function downloadIgResourceToFile(resource, filePath) {
    let downloadUrl = resource.downloadUrl;
    if ((!downloadUrl || downloadUrl.startsWith('pending:')) &&
        resource.resourceContent) {
        const resolved = await resolveProviderDownloadUrl({
            resource_content: resource.resourceContent,
            format: resource.format,
            type: resource.type,
            resource_id: resource.id,
            download_mode: resource.downloadMode,
        });
        if (!resolved) {
            throw new AppError('Could not resolve Instagram media download URL (audio/video task failed).', 502, 'IMPORT_DOWNLOAD_FAILED');
        }
        downloadUrl = resolved;
    }
    if (!downloadUrl || downloadUrl.startsWith('pending:')) {
        throw new AppError('Instagram media has no downloadable URL', 502, 'IMPORT_DOWNLOAD_FAILED');
    }
    const fetched = await safeFetchMediaStream(downloadUrl, {
        headers: downloadHeadersForUrl(downloadUrl),
    });
    return writeStreamToFile(fetched.stream, filePath);
}
export async function previewInstagramPublicLink(_userId, url) {
    assertValidInstagramPublicUrl(url);
    const parsed = await instagramPublicUrlImportProvider.parse(url);
    const existingIds = parsed.resources.map((r) => r.id);
    const existing = existingIds.length
        ? await MediaAsset.find({
            userId: _userId,
            sourcePlatform: 'instagram',
            sourceExternalId: parsed.externalId,
            sourceResourceId: { $in: existingIds },
            status: 'ready',
        }).select('_id sourceResourceId')
        : [];
    const existingMap = new Map(existing.map((m) => [m.sourceResourceId, m._id.toString()]));
    return {
        sourceUrl: parsed.sourceUrl,
        sourcePlatform: parsed.sourcePlatform,
        externalId: parsed.externalId,
        title: parsed.title,
        caption: parsed.caption,
        thumbnail: parsed.thumbnail,
        duration: parsed.duration,
        durationSeconds: parsed.durationSeconds,
        resources: parsed.resources.map((r) => ({
            id: r.id,
            type: r.type,
            format: r.format,
            quality: r.quality,
            size: r.size,
            // Never expose pending tokens or provider resource_content to the client.
            downloadUrl: r.downloadUrl.startsWith('pending:') ? '' : r.downloadUrl,
            selected: false,
            alreadyImported: existingMap.has(r.id),
            existingMediaId: existingMap.get(r.id),
            importable: (r.type === 'video' || r.type === 'image' || r.type === 'audio') &&
                (!r.downloadUrl.startsWith('pending:') || Boolean(r.resourceContent)),
        })),
    };
}
export async function enqueueInstagramPublicImport(userId, input) {
    if (!input.rightsConfirmed) {
        throw new AppError('Confirm that you own this content or have permission to reuse and republish it.', 400, 'IMPORT_RIGHTS_NOT_CONFIRMED');
    }
    assertValidInstagramPublicUrl(input.sourceUrl);
    assertR2Ready();
    if (input.resourceIds.length > INSTAGRAM_PUBLIC_IMPORT_MAX_RESOURCES) {
        throw new AppError(`You can import at most ${INSTAGRAM_PUBLIC_IMPORT_MAX_RESOURCES} resources at a time`, 400, 'VALIDATION_ERROR');
    }
    const { parsed, selected } = await instagramPublicUrlImportProvider.resolveResources(input.sourceUrl, input.resourceIds);
    const jobs = [];
    for (const resource of selected) {
        if (!input.forceDuplicate) {
            const existing = await findExistingResourceImport(userId, 'instagram', parsed.externalId, resource.id);
            if (existing) {
                const job = await ContentImportJob.create({
                    userId: new Types.ObjectId(userId),
                    sourceType: 'instagram_import',
                    sourcePlatform: 'instagram',
                    externalId: parsed.externalId,
                    sourceResourceId: resource.id,
                    sourceUrl: parsed.sourceUrl,
                    status: 'already_imported',
                    mediaAssetId: existing._id,
                    caption: existing.sourceCaption ?? parsed.caption,
                    thumbnailUrl: existing.thumbnailPublicUrl ?? parsed.thumbnail,
                    progress: 100,
                    metadata: { quality: resource.quality, type: resource.type },
                });
                jobs.push(toPublicJob(job));
                continue;
            }
        }
        const job = await ContentImportJob.create({
            userId: new Types.ObjectId(userId),
            sourceType: 'instagram_import',
            sourcePlatform: 'instagram',
            externalId: parsed.externalId,
            sourceResourceId: resource.id,
            sourceUrl: parsed.sourceUrl,
            status: 'pending',
            progress: 0,
            caption: parsed.caption,
            thumbnailUrl: parsed.thumbnail,
            metadata: {
                title: parsed.title,
                quality: resource.quality,
                type: resource.type,
                format: resource.format,
                rightsConfirmed: true,
            },
        });
        await getContentImportQueue().add('import-instagram-public', {
            jobId: job._id.toString(),
            userId,
            sourceUrl: parsed.sourceUrl,
            externalId: parsed.externalId,
            sourceResourceId: resource.id,
            sourceType: 'instagram_public',
            forceDuplicate: Boolean(input.forceDuplicate),
        }, { jobId: `import-${job._id.toString()}` });
        jobs.push(toPublicJob(job));
    }
    logger.info('Enqueued Instagram public imports', {
        userId,
        sourceExternalId: parsed.externalId,
        jobCount: jobs.length,
    });
    return {
        jobs,
        preview: {
            title: parsed.title,
            caption: parsed.caption,
            thumbnail: parsed.thumbnail,
            externalId: parsed.externalId,
            sourceUrl: parsed.sourceUrl,
        },
    };
}
async function streamUploadToR2(params) {
    const r2Key = params.importPlatform
        ? buildImportObjectKey(params.userId, params.importPlatform, params.mimeType)
        : buildObjectKey(params.userId, params.mimeType, params.mediaType);
    try {
        await getR2Client().send(new PutObjectCommand({
            Bucket: getR2Bucket(),
            Key: r2Key,
            Body: params.stream,
            ContentType: params.mimeType,
            ...(params.contentLength !== undefined ? { ContentLength: params.contentLength } : {}),
        }));
    }
    catch (error) {
        throw new AppError(error instanceof Error ? error.message : 'Failed to upload imported media to storage', 502, 'IMPORT_R2_UPLOAD_FAILED');
    }
    return {
        r2Key,
        publicUrl: buildPublicUrl(r2Key) || '',
    };
}
async function maybeImportThumbnail(params) {
    if (!params.thumbnailUrl)
        return {};
    try {
        const fetched = await safeFetchMediaStream(params.thumbnailUrl, {
            maxBytes: Math.min(env.MEDIA_MAX_UPLOAD_BYTES, 15 * 1024 * 1024),
        });
        const mime = normalizeMimeType(fetched.contentType, 'image/jpeg');
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime)) {
            fetched.stream.destroy();
            return { originalThumbnailUrl: params.thumbnailUrl };
        }
        const uploaded = await streamUploadToR2({
            userId: params.userId,
            mimeType: mime,
            mediaType: 'thumbnail',
            stream: fetched.stream,
            contentLength: fetched.contentLength,
        });
        return {
            thumbnailR2Key: uploaded.r2Key,
            thumbnailPublicUrl: uploaded.publicUrl,
            originalThumbnailUrl: params.thumbnailUrl,
        };
    }
    catch {
        return { originalThumbnailUrl: params.thumbnailUrl };
    }
}
export async function listImportSources(userId) {
    const accounts = await SocialAccount.find({
        userId,
        platform: { $in: listImportablePlatforms() },
    }).sort({ createdAt: -1 });
    return {
        platforms: listImportablePlatforms().map((platform) => ({
            platform,
            supported: true,
        })),
        urlImport: {
            supported: true,
            adapters: ['direct-media-url', 'instagram-permalink', 'instagram-public-link'],
            note: 'Paste a public Instagram reel/post link (Import Instagram), an Instagram link from a connected account, or a direct media file URL.',
        },
        accounts: accounts.map((account) => ({
            id: account._id.toString(),
            platform: account.platform,
            accountType: account.accountType,
            platformAccountId: account.platformAccountId,
            username: account.username,
            displayName: account.displayName,
            profilePicture: account.profilePicture,
            status: account.status,
            permissions: account.permissions,
        })),
    };
}
export async function listAccountMedia(userId, socialAccountId, options) {
    if (!Types.ObjectId.isValid(socialAccountId)) {
        throw new AppError('Invalid social account id', 400, 'INVALID_SOCIAL_ACCOUNT_ID');
    }
    const account = await SocialAccount.findOne({ _id: socialAccountId, userId });
    if (!account) {
        throw new AppError('Social account not found', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
    }
    if (account.status === 'expired' || account.status === 'revoked') {
        throw new AppError('This account token has expired. Please reconnect.', 401, 'IMPORT_TOKEN_EXPIRED', { status: account.status });
    }
    const accessToken = await metaTokenService.getDecryptedAccessToken(userId, socialAccountId).catch((error) => {
        if (error instanceof AppError && error.code === 'META_TOKEN_EXPIRED') {
            throw new AppError('This account token has expired. Please reconnect.', 401, 'IMPORT_TOKEN_EXPIRED', error.details);
        }
        throw error;
    });
    const provider = getContentImportProvider(account.platform);
    const limit = Math.min(Math.max(options.limit ?? CONTENT_IMPORT_DEFAULT_PAGE_SIZE, 1), CONTENT_IMPORT_DEFAULT_PAGE_SIZE);
    let result;
    try {
        result = await provider.listMedia({
            userId,
            socialAccountId,
            platformAccountId: account.platformAccountId,
            accessToken,
            limit,
            cursor: options.cursor,
        });
    }
    catch (error) {
        if (error instanceof AppError && error.code === 'IMPORT_TOKEN_EXPIRED') {
            await metaTokenService.markReconnectRequired(userId, socialAccountId, 'expired');
        }
        throw error;
    }
    const externalIds = result.items.map((item) => item.externalId);
    const existing = externalIds.length
        ? await MediaAsset.find({
            userId,
            sourcePlatform: account.platform,
            sourceExternalId: { $in: externalIds },
            status: 'ready',
        }).select('_id sourceExternalId')
        : [];
    const existingMap = new Map(existing.map((m) => [m.sourceExternalId, m._id.toString()]));
    const items = result.items.map((item) => {
        const existingMediaId = existingMap.get(item.externalId);
        return {
            ...item,
            alreadyImported: Boolean(existingMediaId),
            existingMediaId,
        };
    });
    return {
        items,
        nextCursor: result.nextCursor,
        account: {
            id: account._id.toString(),
            platform: account.platform,
            username: account.username,
            displayName: account.displayName,
        },
        pageSize: limit,
    };
}
export async function enqueueAccountImport(userId, socialAccountId, externalIds) {
    if (!Types.ObjectId.isValid(socialAccountId)) {
        throw new AppError('Invalid social account id', 400, 'INVALID_SOCIAL_ACCOUNT_ID');
    }
    if (externalIds.length === 0) {
        throw new AppError('No media selected', 400, 'VALIDATION_ERROR');
    }
    if (externalIds.length > CONTENT_IMPORT_MAX_BATCH) {
        throw new AppError(`You can import at most ${CONTENT_IMPORT_MAX_BATCH} items at a time`, 400, 'VALIDATION_ERROR');
    }
    const account = await SocialAccount.findOne({ _id: socialAccountId, userId });
    if (!account) {
        throw new AppError('Social account not found', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
    }
    if (account.status !== 'active') {
        throw new AppError('This account token has expired. Please reconnect.', 401, 'IMPORT_TOKEN_EXPIRED', { status: account.status });
    }
    const uniqueIds = [...new Set(externalIds)];
    const jobs = [];
    for (const externalId of uniqueIds) {
        const existing = await findExistingImport(userId, account.platform, externalId);
        if (existing) {
            const job = await ContentImportJob.create({
                userId: new Types.ObjectId(userId),
                sourceType: account.platform,
                sourcePlatform: account.platform,
                socialAccountId: account._id,
                externalId,
                status: 'already_imported',
                mediaAssetId: existing._id,
                caption: existing.sourceCaption,
                progress: 100,
            });
            jobs.push(toPublicJob(job));
            continue;
        }
        const job = await ContentImportJob.create({
            userId: new Types.ObjectId(userId),
            sourceType: account.platform,
            sourcePlatform: account.platform,
            socialAccountId: account._id,
            externalId,
            status: 'pending',
            progress: 0,
        });
        await getContentImportQueue().add('import-account-media', {
            jobId: job._id.toString(),
            userId,
            socialAccountId,
            externalId,
            sourceType: 'account',
        }, { jobId: `import-${job._id.toString()}` });
        jobs.push(toPublicJob(job));
    }
    return { jobs };
}
export async function previewUrlImport(userId, url, options) {
    if (isInstagramMediaUrl(url)) {
        const matched = await resolveOwnedInstagramPermalink(userId, url, {
            socialAccountId: options?.socialAccountId,
        });
        const accountLabel = matched.account.username
            ? `@${matched.account.username}`
            : matched.account.displayName || matched.account.platformAccountId;
        return {
            adapter: 'instagram-permalink',
            preview: {
                url: matched.parsed.normalizedUrl,
                mediaType: matched.item.mediaType,
                mimeType: matched.item.mediaType === 'image' || matched.item.mediaType === 'carousel'
                    ? 'image/jpeg'
                    : 'video/mp4',
                filename: `instagram-${matched.item.externalId}`,
                thumbnailUrl: matched.item.thumbnailUrl,
                caption: matched.item.caption,
                platform: 'instagram',
                shortcode: matched.parsed.shortcode,
                permalink: matched.item.permalink ?? matched.parsed.normalizedUrl,
                externalId: matched.item.externalId,
                socialAccountId: matched.account.id,
                accountLabel,
                alreadyImported: matched.alreadyImported,
                existingMediaId: matched.existingMediaId,
            },
        };
    }
    const adapter = findUrlImportAdapter(url);
    if (!adapter) {
        throw new AppError('This source cannot be imported automatically. Paste an Instagram reel/post link from a connected account, a direct media file URL, or upload the file.', 400, 'IMPORT_SOURCE_UNSUPPORTED');
    }
    const preview = await adapter.preview(url);
    return { preview, adapter: adapter.id };
}
export async function enqueueUrlImport(userId, url, options) {
    if (isInstagramMediaUrl(url)) {
        const matched = await resolveOwnedInstagramPermalink(userId, url, {
            socialAccountId: options?.socialAccountId,
        });
        // Reuse the connected-account import pipeline (official media_url → R2).
        return enqueueAccountImport(userId, matched.account.id, [matched.item.externalId]);
    }
    const adapter = findUrlImportAdapter(url);
    if (!adapter) {
        throw new AppError('This source cannot be imported automatically. Paste an Instagram reel/post link from a connected account, a direct media file URL, or upload the file.', 400, 'IMPORT_SOURCE_UNSUPPORTED');
    }
    await adapter.preview(url);
    const externalId = `url:${Buffer.from(url).toString('base64url').slice(0, 120)}`;
    const existing = await findExistingImport(userId, 'url', externalId);
    if (existing) {
        const job = await ContentImportJob.create({
            userId: new Types.ObjectId(userId),
            sourceType: 'url',
            sourcePlatform: 'url',
            externalId,
            sourceUrl: url,
            status: 'already_imported',
            mediaAssetId: existing._id,
            progress: 100,
        });
        return { jobs: [toPublicJob(job)], media: await toPublicMedia(existing) };
    }
    const job = await ContentImportJob.create({
        userId: new Types.ObjectId(userId),
        sourceType: 'url',
        sourcePlatform: 'url',
        externalId,
        sourceUrl: url,
        status: 'pending',
        progress: 0,
    });
    await getContentImportQueue().add('import-url-media', {
        jobId: job._id.toString(),
        userId,
        sourceUrl: url,
        sourceType: 'url',
    }, { jobId: `import-${job._id.toString()}` });
    return { jobs: [toPublicJob(job)] };
}
export async function getImportJob(userId, jobId) {
    if (!Types.ObjectId.isValid(jobId)) {
        throw new AppError('Invalid import job id', 400, 'VALIDATION_ERROR');
    }
    const job = await ContentImportJob.findOne({ _id: jobId, userId });
    if (!job) {
        throw new AppError('Import job not found', 404, 'IMPORT_MEDIA_NOT_FOUND');
    }
    return toPublicJob(job);
}
export async function getImportJobs(userId, jobIds) {
    const objectIds = jobIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0)
        return [];
    const jobs = await ContentImportJob.find({ _id: { $in: objectIds }, userId }).sort({ createdAt: 1 });
    return jobs.map(toPublicJob);
}
export async function retryImportJob(userId, jobId) {
    if (!Types.ObjectId.isValid(jobId)) {
        throw new AppError('Invalid import job id', 400, 'VALIDATION_ERROR');
    }
    const job = await ContentImportJob.findOne({ _id: jobId, userId });
    if (!job) {
        throw new AppError('Import job not found', 404, 'IMPORT_MEDIA_NOT_FOUND');
    }
    if (job.status !== 'failed') {
        throw new AppError('Only failed import jobs can be retried', 400, 'VALIDATION_ERROR');
    }
    job.status = 'pending';
    job.progress = 0;
    job.errorCode = undefined;
    job.errorMessage = undefined;
    await job.save();
    if (job.sourceType === 'url' && job.sourceUrl) {
        await getContentImportQueue().add('import-url-media', {
            jobId: job._id.toString(),
            userId,
            sourceUrl: job.sourceUrl,
            sourceType: 'url',
        }, { jobId: `import-retry-${job._id.toString()}-${Date.now()}` });
    }
    else if (job.sourceType === 'instagram_import' && job.sourceUrl && job.sourceResourceId) {
        await getContentImportQueue().add('import-instagram-public', {
            jobId: job._id.toString(),
            userId,
            sourceUrl: job.sourceUrl,
            externalId: job.externalId,
            sourceResourceId: job.sourceResourceId,
            sourceType: 'instagram_public',
            forceDuplicate: true,
        }, { jobId: `import-retry-${job._id.toString()}-${Date.now()}` });
    }
    else if (job.socialAccountId && job.externalId) {
        await getContentImportQueue().add('import-account-media', {
            jobId: job._id.toString(),
            userId,
            socialAccountId: job.socialAccountId.toString(),
            externalId: job.externalId,
            sourceType: 'account',
        }, { jobId: `import-retry-${job._id.toString()}-${Date.now()}` });
    }
    else {
        throw new AppError('Import job is missing source details for retry', 400, 'VALIDATION_ERROR');
    }
    return toPublicJob(job);
}
async function updateJob(jobId, patch) {
    return ContentImportJob.findByIdAndUpdate(jobId, { $set: patch }, { new: true });
}
async function processInstagramPublicImportJob(data, _job) {
    if (!data.sourceUrl || !data.sourceResourceId) {
        throw new AppError('Missing Instagram public import details', 400, 'VALIDATION_ERROR');
    }
    await updateJob(data.jobId, { status: 'resolving', progress: 15 });
    const { parsed, selected } = await instagramPublicUrlImportProvider.resolveResources(data.sourceUrl, [data.sourceResourceId]);
    const resource = selected[0];
    const externalId = parsed.externalId;
    if (!data.forceDuplicate) {
        const existing = await findExistingResourceImport(data.userId, 'instagram', externalId, resource.id);
        if (existing) {
            await updateJob(data.jobId, {
                status: 'already_imported',
                progress: 100,
                mediaAssetId: existing._id,
                caption: existing.sourceCaption ?? parsed.caption,
                thumbnailUrl: existing.thumbnailPublicUrl ?? parsed.thumbnail,
            });
            return;
        }
    }
    if (resource.type !== 'audio' && resource.type !== 'video' && resource.type !== 'image') {
        throw new AppError('Unsupported Instagram resource type', 400, 'IMPORT_SOURCE_UNSUPPORTED');
    }
    const fallbackMime = guessMimeFromResource(resource);
    if (!fallbackMime) {
        throw new AppError('Unsupported Instagram resource type', 400, 'IMPORT_SOURCE_UNSUPPORTED');
    }
    await updateJob(data.jobId, {
        status: 'downloading',
        progress: 35,
        caption: parsed.caption,
        thumbnailUrl: resource.type === 'audio' ? undefined : parsed.thumbnail,
    });
    let finalMime = fallbackMime;
    let mediaType = resolveMediaType(finalMime, resource.type === 'audio' ? 'audio' : undefined);
    let uploadStream;
    let contentLength;
    let muxedAudio = false;
    let tempDir;
    try {
        // Videos often arrive without an audio track from the third-party parser.
        // Download to disk, probe for audio, and mux companion audio when needed.
        if (resource.type === 'video') {
            tempDir = await createImportTempDir();
            let activeVideo = resource;
            let videoPath = join(tempDir, `video-${activeVideo.id}.mp4`);
            let videoBytes = await downloadIgResourceToFile(activeVideo, videoPath);
            assertUploadSize(videoBytes);
            let outputPath = videoPath;
            let outputBytes = videoBytes;
            let hasAudio = await fileHasAudioStream(videoPath);
            // Ladder qualities (1080P/720P/…) are often video-only. Prefer an Original /
            // progressive alternate from the same parse before attempting mux.
            if (!hasAudio) {
                const alternates = alternateVideosWithLikelyAudio(parsed.resources, activeVideo.id);
                for (const alt of alternates) {
                    await updateJob(data.jobId, { status: 'processing', progress: 45 });
                    const altPath = join(tempDir, `video-alt-${alt.id}.mp4`);
                    try {
                        const altBytes = await downloadIgResourceToFile(alt, altPath);
                        assertUploadSize(altBytes);
                        if (await fileHasAudioStream(altPath)) {
                            logger.info('Switched to Instagram video alternate that includes audio', {
                                sourceExternalId: externalId,
                                fromResourceId: activeVideo.id,
                                toResourceId: alt.id,
                                toQuality: alt.quality,
                            });
                            activeVideo = alt;
                            videoPath = altPath;
                            videoBytes = altBytes;
                            outputPath = altPath;
                            outputBytes = altBytes;
                            hasAudio = true;
                            break;
                        }
                    }
                    catch (error) {
                        logger.warn('Failed probing Instagram video alternate for audio', {
                            resourceId: alt.id,
                            error: error instanceof Error ? error.message : String(error),
                        });
                    }
                }
            }
            if (!hasAudio) {
                const companion = pickCompanionAudio(parsed.resources, activeVideo.id);
                if (companion) {
                    await updateJob(data.jobId, { status: 'processing', progress: 50 });
                    const audioPath = join(tempDir, `audio-${companion.id}.bin`);
                    await downloadIgResourceToFile(companion, audioPath);
                    const muxedPath = join(tempDir, `muxed-${activeVideo.id}.mp4`);
                    const muxed = await muxVideoWithAudio({
                        videoPath,
                        audioPath,
                        outputPath: muxedPath,
                    });
                    outputPath = muxed.outputPath;
                    outputBytes = muxed.fileSize;
                    muxedAudio = true;
                    finalMime = 'video/mp4';
                    mediaType = 'video';
                    logger.info('Muxed companion audio into Instagram video', {
                        sourceExternalId: externalId,
                        videoResourceId: activeVideo.id,
                        audioResourceId: companion.id,
                    });
                }
                else {
                    logger.warn('Instagram video has no audio stream and no companion audio resource', {
                        sourceExternalId: externalId,
                        videoResourceId: activeVideo.id,
                        resourceTypes: parsed.resources.map((r) => r.type),
                        qualities: parsed.resources.filter((r) => r.type === 'video').map((r) => r.quality),
                    });
                    throw new AppError('This Instagram reel only returned a silent video from the downloader (no audio track and no separate audio file). Try another reel, or pick “Original” quality if available.', 422, 'INSTAGRAM_PARSE_FAILED', { sourceExternalId: externalId });
                }
            }
            assertUploadSize(outputBytes);
            contentLength = outputBytes;
            uploadStream = createReadStream(outputPath);
        }
        else {
            const fetched = await safeFetchMediaStream(resource.downloadUrl, {
                headers: downloadHeadersForUrl(resource.downloadUrl),
            });
            finalMime = normalizeMimeType(fetched.contentType, fallbackMime);
            assertAllowedMimeType(finalMime);
            if (fetched.contentLength !== undefined)
                assertUploadSize(fetched.contentLength);
            mediaType = resolveMediaType(finalMime, resource.type === 'audio' ? 'audio' : undefined);
            uploadStream = fetched.stream;
            contentLength = fetched.contentLength;
        }
        await updateJob(data.jobId, { status: 'uploading_to_r2', progress: 65 });
        const uploaded = await streamUploadToR2({
            userId: data.userId,
            mimeType: finalMime,
            mediaType,
            stream: uploadStream,
            contentLength,
            importPlatform: 'instagram',
        });
        await updateJob(data.jobId, { status: 'processing', progress: 85 });
        const thumb = mediaType === 'video' || mediaType === 'image'
            ? await maybeImportThumbnail({
                userId: data.userId,
                thumbnailUrl: parsed.thumbnail,
            })
            : {};
        const media = await MediaAsset.create({
            userId: new Types.ObjectId(data.userId),
            type: mediaType,
            originalFilename: sanitizeImportFilename(parsed.title, resource),
            r2Key: uploaded.r2Key,
            publicUrl: uploaded.publicUrl,
            mimeType: finalMime,
            fileSize: contentLength ?? resource.size ?? 0,
            duration: parsed.durationSeconds,
            status: 'ready',
            sourceType: 'instagram_import',
            sourcePlatform: 'instagram',
            sourceExternalId: externalId,
            sourceResourceId: resource.id,
            sourcePostUrl: parsed.sourceUrl,
            sourceCaption: truncateField(parsed.caption, 5000),
            sourceTitle: truncateField(parsed.title, 5000),
            sourceThumbnail: thumb.thumbnailPublicUrl ?? (mediaType === 'audio' ? undefined : parsed.thumbnail),
            importedAt: new Date(),
            sourceMetadata: {
                quality: resource.quality,
                format: resource.format,
                resourceType: resource.type,
                downloadMode: resource.downloadMode,
                muxedAudio,
            },
            originalThumbnailUrl: thumb.originalThumbnailUrl ?? (mediaType === 'audio' ? undefined : parsed.thumbnail),
            thumbnailR2Key: thumb.thumbnailR2Key,
            thumbnailPublicUrl: thumb.thumbnailPublicUrl,
        });
        await updateJob(data.jobId, {
            status: 'completed',
            progress: 100,
            mediaAssetId: media._id,
            caption: truncateField(parsed.caption, 5000),
            thumbnailUrl: thumb.thumbnailPublicUrl ?? parsed.thumbnail,
        });
        logger.info('Instagram public import completed', {
            userId: data.userId,
            sourceExternalId: externalId,
            importJobId: data.jobId,
            mediaAssetId: media._id.toString(),
            sourceResourceId: resource.id,
            muxedAudio,
        });
    }
    finally {
        await cleanupTempDir(tempDir);
    }
}
export async function processImportJob(data) {
    assertR2Ready();
    const job = await ContentImportJob.findOne({ _id: data.jobId, userId: data.userId });
    if (!job) {
        logger.warn('Import job missing', { jobId: data.jobId });
        return;
    }
    try {
        await updateJob(data.jobId, { status: 'fetching_metadata', progress: 10 });
        if (data.sourceType === 'instagram_public') {
            await processInstagramPublicImportJob(data, job);
            return;
        }
        if (data.sourceType === 'url') {
            if (!data.sourceUrl)
                throw new AppError('Missing source URL', 400, 'IMPORT_SOURCE_UNSUPPORTED');
            const adapter = findUrlImportAdapter(data.sourceUrl);
            if (!adapter) {
                throw new AppError('This source cannot be imported automatically. Connect the account or upload the media directly.', 400, 'IMPORT_SOURCE_UNSUPPORTED');
            }
            const resolved = await adapter.resolve(data.sourceUrl);
            const mimeType = normalizeMimeType(resolved.mimeType);
            assertAllowedMimeType(mimeType);
            await updateJob(data.jobId, { status: 'downloading', progress: 30 });
            const fetched = await safeFetchMediaStream(resolved.directUrl);
            const finalMime = normalizeMimeType(fetched.contentType, mimeType);
            assertAllowedMimeType(finalMime);
            if (fetched.contentLength !== undefined)
                assertUploadSize(fetched.contentLength);
            const mediaType = resolveMediaType(finalMime);
            await updateJob(data.jobId, { status: 'uploading_to_r2', progress: 60 });
            const uploaded = await streamUploadToR2({
                userId: data.userId,
                mimeType: finalMime,
                mediaType,
                stream: fetched.stream,
                contentLength: fetched.contentLength,
            });
            await updateJob(data.jobId, { status: 'processing', progress: 85 });
            const externalId = job.externalId ?? `url:${Buffer.from(data.sourceUrl).toString('base64url').slice(0, 120)}`;
            const existing = await findExistingImport(data.userId, 'url', externalId);
            if (existing) {
                await updateJob(data.jobId, {
                    status: 'already_imported',
                    progress: 100,
                    mediaAssetId: existing._id,
                });
                return;
            }
            const media = await MediaAsset.create({
                userId: new Types.ObjectId(data.userId),
                type: mediaType,
                originalFilename: resolved.filename ?? 'imported-media',
                r2Key: uploaded.r2Key,
                publicUrl: uploaded.publicUrl,
                mimeType: finalMime,
                fileSize: fetched.contentLength ?? 0,
                status: 'ready',
                sourceType: 'url',
                sourcePlatform: 'url',
                sourceExternalId: externalId,
                sourcePostUrl: data.sourceUrl,
                importedAt: new Date(),
                sourceMetadata: { adapter: adapter.id },
            });
            await updateJob(data.jobId, {
                status: 'completed',
                progress: 100,
                mediaAssetId: media._id,
            });
            return;
        }
        // Connected account import
        if (!data.socialAccountId || !data.externalId) {
            throw new AppError('Missing account import details', 400, 'VALIDATION_ERROR');
        }
        const account = await SocialAccount.findOne({
            _id: data.socialAccountId,
            userId: data.userId,
        });
        if (!account) {
            throw new AppError('Social account not found', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
        }
        const existing = await findExistingImport(data.userId, account.platform, data.externalId);
        if (existing) {
            await updateJob(data.jobId, {
                status: 'already_imported',
                progress: 100,
                mediaAssetId: existing._id,
                caption: existing.sourceCaption,
            });
            return;
        }
        const accessToken = await metaTokenService
            .getDecryptedAccessToken(data.userId, data.socialAccountId)
            .catch((error) => {
            if (error instanceof AppError && error.code === 'META_TOKEN_EXPIRED') {
                throw new AppError('This account token has expired. Please reconnect.', 401, 'IMPORT_TOKEN_EXPIRED', error.details);
            }
            throw error;
        });
        const provider = getContentImportProvider(account.platform);
        const details = await provider.getMediaDetails({
            userId: data.userId,
            socialAccountId: data.socialAccountId,
            platformAccountId: account.platformAccountId,
            accessToken,
            externalId: data.externalId,
        });
        const resolved = await provider.resolveMediaSource({
            userId: data.userId,
            socialAccountId: data.socialAccountId,
            platformAccountId: account.platformAccountId,
            accessToken,
            externalId: data.externalId,
            item: details,
        });
        const mimeType = normalizeMimeType(resolved.mimeType, details.mediaType === 'image' ? 'image/jpeg' : 'video/mp4');
        assertAllowedMimeType(mimeType);
        // Prefer videos/reels for publishing workflow; still allow images.
        const mediaType = resolveMediaType(mimeType);
        if (mediaType === 'video' &&
            !ALLOWED_VIDEO_MIME_TYPES.includes(mimeType)) {
            throw new AppError('Unsupported video type from source', 400, 'IMPORT_SOURCE_UNSUPPORTED');
        }
        await updateJob(data.jobId, {
            status: 'downloading',
            progress: 30,
            caption: details.caption,
            thumbnailUrl: details.thumbnailUrl,
        });
        const fetched = await safeFetchMediaStream(resolved.directUrl);
        const finalMime = normalizeMimeType(fetched.contentType, mimeType);
        assertAllowedMimeType(finalMime);
        if (fetched.contentLength !== undefined)
            assertUploadSize(fetched.contentLength);
        await updateJob(data.jobId, { status: 'uploading_to_r2', progress: 60 });
        const uploaded = await streamUploadToR2({
            userId: data.userId,
            mimeType: finalMime,
            mediaType: resolveMediaType(finalMime),
            stream: fetched.stream,
            contentLength: fetched.contentLength,
        });
        await updateJob(data.jobId, { status: 'processing', progress: 80 });
        const thumb = await maybeImportThumbnail({
            userId: data.userId,
            thumbnailUrl: resolved.thumbnailUrl ?? details.thumbnailUrl,
        });
        const media = await MediaAsset.create({
            userId: new Types.ObjectId(data.userId),
            type: resolveMediaType(finalMime),
            originalFilename: resolved.filename ?? `${account.platform}-${data.externalId}`,
            r2Key: uploaded.r2Key,
            publicUrl: uploaded.publicUrl,
            mimeType: finalMime,
            fileSize: fetched.contentLength ?? 0,
            duration: details.duration,
            status: 'ready',
            sourceType: account.platform,
            sourcePlatform: account.platform,
            sourceAccountId: account._id,
            sourceExternalId: data.externalId,
            sourcePostUrl: details.permalink,
            sourceCaption: details.caption,
            importedAt: new Date(),
            sourceMetadata: details.metadata,
            originalThumbnailUrl: thumb.originalThumbnailUrl,
            thumbnailR2Key: thumb.thumbnailR2Key,
            thumbnailPublicUrl: thumb.thumbnailPublicUrl,
        });
        await updateJob(data.jobId, {
            status: 'completed',
            progress: 100,
            mediaAssetId: media._id,
            caption: details.caption,
            thumbnailUrl: thumb.thumbnailPublicUrl ?? details.thumbnailUrl,
        });
    }
    catch (error) {
        const appError = error instanceof AppError
            ? error
            : new AppError(error instanceof Error ? error.message : 'Import failed', 500, 'IMPORT_PLATFORM_ERROR');
        logger.error('Import job failed', {
            jobId: data.jobId,
            code: appError.code,
            message: appError.message,
        });
        await updateJob(data.jobId, {
            status: 'failed',
            errorCode: appError.code,
            errorMessage: appError.message,
            progress: 100,
        });
        throw appError;
    }
}
//# sourceMappingURL=content-import.service.js.map