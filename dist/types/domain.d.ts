export declare const SOCIAL_PLATFORMS: readonly ["instagram", "facebook"];
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export declare const SOCIAL_ACCOUNT_TYPES: readonly ["instagram_business", "instagram_creator", "facebook_page"];
export type SocialAccountType = (typeof SOCIAL_ACCOUNT_TYPES)[number];
export declare const SOCIAL_ACCOUNT_STATUSES: readonly ["active", "expired", "revoked", "error"];
export type SocialAccountStatus = (typeof SOCIAL_ACCOUNT_STATUSES)[number];
export declare const MEDIA_TYPES: readonly ["video", "image", "thumbnail"];
export type MediaType = (typeof MEDIA_TYPES)[number];
export declare const MEDIA_STATUSES: readonly ["uploading", "ready", "failed"];
export type MediaStatus = (typeof MEDIA_STATUSES)[number];
export declare const PUBLISH_MODES: readonly ["now", "scheduled"];
export type PublishMode = (typeof PUBLISH_MODES)[number];
export declare const POST_STATUSES: readonly ["draft", "queued", "scheduled", "processing", "partially_published", "published", "failed", "cancelled"];
export type PostStatus = (typeof POST_STATUSES)[number];
export declare const DESTINATION_STATUSES: readonly ["pending", "queued", "processing", "uploading", "processing_media", "ready_to_publish", "publishing", "published", "failed", "cancelled"];
export type DestinationStatus = (typeof DESTINATION_STATUSES)[number];
//# sourceMappingURL=domain.d.ts.map