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

export const MEDIA_TYPES = ['video', 'image', 'thumbnail'] as const;
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
