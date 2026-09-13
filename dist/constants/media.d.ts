export declare const ALLOWED_VIDEO_MIME_TYPES: readonly ["video/mp4", "video/quicktime"];
export declare const ALLOWED_IMAGE_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
export declare const ALLOWED_AUDIO_MIME_TYPES: readonly ["audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav", "audio/webm"];
export declare const ALLOWED_MEDIA_MIME_TYPES: readonly ["video/mp4", "video/quicktime", "image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav", "audio/webm"];
export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];
export declare const MIME_TO_EXTENSION: Record<AllowedMediaMimeType, string>;
//# sourceMappingURL=media.d.ts.map