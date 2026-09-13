export const SOCIAL_PLATFORMS = ['instagram', 'facebook'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_ACCOUNT_TYPES = [
  'instagram_business',
  'instagram_creator',
  'facebook_page',
] as const;
export type SocialAccountType = (typeof SOCIAL_ACCOUNT_TYPES)[number];

export const SOCIAL_ACCOUNT_STATUSES = ['active', 'expired', 'revoked', 'error'] as const;
export type SocialAccountStatus = (typeof SOCIAL_ACCOUNT_STATUSES)[number];

export const MEDIA_TYPES = ['video', 'image', 'thumbnail', 'audio'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const MEDIA_STATUSES = ['uploading', 'ready', 'failed'] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const PUBLISH_MODES = ['now', 'scheduled'] as const;
export type PublishMode = (typeof PUBLISH_MODES)[number];

export const POST_STATUSES = [
  'draft',
  'queued',
  'scheduled',
  'processing',
  'partially_published',
  'published',
  'failed',
  'cancelled',
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

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
] as const;
export type DestinationStatus = (typeof DESTINATION_STATUSES)[number];

export const MEDIA_SOURCE_TYPES = [
  'upload',
  'instagram',
  'instagram_import',
  'facebook',
  'url',
  'other',
] as const;
export type MediaSourceType = (typeof MEDIA_SOURCE_TYPES)[number];

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
] as const;
export type ContentImportJobStatus = (typeof CONTENT_IMPORT_JOB_STATUSES)[number];

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
] as const;
export type ContentImportErrorCode = (typeof CONTENT_IMPORT_ERROR_CODES)[number];
