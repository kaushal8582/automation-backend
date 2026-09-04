export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime'] as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_VIDEO_MIME_TYPES,
  ...ALLOWED_IMAGE_MIME_TYPES,
] as const;

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

export const MIME_TO_EXTENSION: Record<AllowedMediaMimeType, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
