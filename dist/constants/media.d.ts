export declare const ALLOWED_VIDEO_MIME_TYPES: readonly ["video/mp4", "video/quicktime"];
export declare const ALLOWED_IMAGE_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
export declare const ALLOWED_MEDIA_MIME_TYPES: readonly ["video/mp4", "video/quicktime", "image/jpeg", "image/png", "image/webp"];
export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];
export declare const MIME_TO_EXTENSION: Record<AllowedMediaMimeType, string>;
//# sourceMappingURL=media.d.ts.map