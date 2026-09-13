import { randomUUID } from 'node:crypto';
import { ALLOWED_AUDIO_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES, ALLOWED_MEDIA_MIME_TYPES, ALLOWED_VIDEO_MIME_TYPES, MIME_TO_EXTENSION, } from '../constants/media.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.js';
export function assertAllowedMimeType(mimeType) {
    if (!ALLOWED_MEDIA_MIME_TYPES.includes(mimeType)) {
        throw new AppError(`Unsupported mime type: ${mimeType}`, 400, 'INVALID_MEDIA_TYPE', { allowed: ALLOWED_MEDIA_MIME_TYPES });
    }
}
export function assertUploadSize(fileSize) {
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
        throw new AppError('fileSize must be a positive number', 400, 'INVALID_FILE_SIZE');
    }
    if (fileSize > env.MEDIA_MAX_UPLOAD_BYTES) {
        throw new AppError(`File exceeds maximum upload size of ${env.MEDIA_MAX_UPLOAD_BYTES} bytes`, 400, 'FILE_TOO_LARGE', { maxBytes: env.MEDIA_MAX_UPLOAD_BYTES });
    }
}
export function resolveMediaType(mimeType, requested) {
    if (requested === 'thumbnail') {
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
            throw new AppError('Thumbnails must be image/*', 400, 'INVALID_THUMBNAIL_TYPE');
        }
        return 'thumbnail';
    }
    if (requested === 'audio') {
        if (!ALLOWED_AUDIO_MIME_TYPES.includes(mimeType)) {
            throw new AppError('Audio assets must be audio/*', 400, 'INVALID_MEDIA_TYPE');
        }
        return 'audio';
    }
    if (ALLOWED_VIDEO_MIME_TYPES.includes(mimeType)) {
        return 'video';
    }
    if (ALLOWED_AUDIO_MIME_TYPES.includes(mimeType)) {
        return 'audio';
    }
    return 'image';
}
/**
 * Build a unique R2 object key. Never uses the original filename as the key.
 * Example: users/{userId}/videos/{uuid}.mp4
 */
export function buildObjectKey(userId, mimeType, mediaType) {
    const ext = MIME_TO_EXTENSION[mimeType];
    const folder = mediaType === 'video'
        ? 'videos'
        : mediaType === 'thumbnail'
            ? 'thumbnails'
            : mediaType === 'audio'
                ? 'audio'
                : 'images';
    return `users/${userId}/${folder}/${randomUUID()}.${ext}`;
}
/**
 * R2 key for public-link imports.
 * Example: users/{userId}/imports/instagram/{uuid}.mp4
 */
export function buildImportObjectKey(userId, platform, mimeType) {
    const ext = MIME_TO_EXTENSION[mimeType];
    const safePlatform = platform.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'import';
    return `users/${userId}/imports/${safePlatform}/${randomUUID()}.${ext}`;
}
/**
 * Extension point for future FFmpeg probe/transcode validation.
 * Phase 4 only checks metadata constraints; does not block the event loop on large files.
 */
export async function validateMediaMetadata(input) {
    assertAllowedMimeType(input.mimeType);
    assertUploadSize(input.fileSize);
    if (input.duration !== undefined && input.duration < 0) {
        throw new AppError('duration must be >= 0', 400, 'INVALID_DURATION');
    }
    if (input.width !== undefined && input.width <= 0) {
        throw new AppError('width must be > 0', 400, 'INVALID_DIMENSIONS');
    }
    if (input.height !== undefined && input.height <= 0) {
        throw new AppError('height must be > 0', 400, 'INVALID_DIMENSIONS');
    }
    // Future: enqueue FFmpeg probe job without reading the full file into Node memory.
}
//# sourceMappingURL=media-validation.service.js.map