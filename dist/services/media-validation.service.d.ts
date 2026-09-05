import { type AllowedMediaMimeType } from '../constants/media.js';
import type { MediaType } from '../types/domain.js';
export declare function assertAllowedMimeType(mimeType: string): asserts mimeType is AllowedMediaMimeType;
export declare function assertUploadSize(fileSize: number): void;
export declare function resolveMediaType(mimeType: AllowedMediaMimeType, requested?: MediaType): MediaType;
/**
 * Build a unique R2 object key. Never uses the original filename as the key.
 * Example: users/{userId}/videos/{uuid}.mp4
 */
export declare function buildObjectKey(userId: string, mimeType: AllowedMediaMimeType, mediaType: MediaType): string;
/**
 * Extension point for future FFmpeg probe/transcode validation.
 * Phase 4 only checks metadata constraints; does not block the event loop on large files.
 */
export declare function validateMediaMetadata(input: {
    mimeType: string;
    fileSize: number;
    duration?: number;
    width?: number;
    height?: number;
}): Promise<void>;
//# sourceMappingURL=media-validation.service.d.ts.map