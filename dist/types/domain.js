export const SOCIAL_PLATFORMS = ['instagram', 'facebook'];
export const SOCIAL_ACCOUNT_TYPES = [
    'instagram_business',
    'instagram_creator',
    'facebook_page',
];
export const SOCIAL_ACCOUNT_STATUSES = ['active', 'expired', 'revoked', 'error'];
export const MEDIA_TYPES = ['video', 'image', 'thumbnail', 'audio'];
export const MEDIA_STATUSES = ['uploading', 'ready', 'failed'];
export const PUBLISH_MODES = ['now', 'scheduled'];
export const POST_STATUSES = [
    'draft',
    'queued',
    'scheduled',
    'processing',
    'partially_published',
    'published',
    'failed',
    'cancelled',
];
export const DESTINATION_STATUSES = [
    'pending',
    'queued',
    'processing',
    'uploading',
    'processing_media',
    'ready_to_publish',
    'publishing',
    'published',
    'failed',
    'cancelled',
];
export const MEDIA_SOURCE_TYPES = [
    'upload',
    'instagram',
    'instagram_import',
    'facebook',
    'url',
    'other',
];
export const CONTENT_IMPORT_JOB_STATUSES = [
    'pending',
    'fetching_metadata',
    'resolving',
    'downloading',
    'uploading_to_r2',
    'processing',
    'completed',
    'failed',
    'already_imported',
];
export const CONTENT_IMPORT_ERROR_CODES = [
    'IMPORT_SOURCE_UNSUPPORTED',
    'IMPORT_PERMISSION_REQUIRED',
    'IMPORT_TOKEN_EXPIRED',
    'IMPORT_MEDIA_NOT_FOUND',
    'IMPORT_MEDIA_TOO_LARGE',
    'IMPORT_DOWNLOAD_FAILED',
    'IMPORT_UPLOAD_FAILED',
    'IMPORT_R2_UPLOAD_FAILED',
    'IMPORT_DUPLICATE',
    'IMPORT_RATE_LIMITED',
    'IMPORT_PLATFORM_ERROR',
    'IMPORT_RIGHTS_NOT_CONFIRMED',
    'INVALID_INSTAGRAM_URL',
    'INSTAGRAM_PARSE_FAILED',
    'INSTAGRAM_MEDIA_NOT_FOUND',
    'INSTAGRAM_PROVIDER_RATE_LIMIT',
    'INSTAGRAM_PROVIDER_UNAVAILABLE',
    'INSTAGRAM_DOWNLOAD_EXPIRED',
];
//# sourceMappingURL=domain.js.map