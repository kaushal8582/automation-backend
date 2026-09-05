export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime'];
export const ALLOWED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
];
export const ALLOWED_MEDIA_MIME_TYPES = [
    ...ALLOWED_VIDEO_MIME_TYPES,
    ...ALLOWED_IMAGE_MIME_TYPES,
];
export const MIME_TO_EXTENSION = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};
//# sourceMappingURL=media.js.map