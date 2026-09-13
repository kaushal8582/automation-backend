export const CONTENT_IMPORT_DEFAULT_PAGE_SIZE = 10;
export const CONTENT_IMPORT_MAX_PAGE_SIZE = 10;
export const CONTENT_IMPORT_MAX_BATCH = 10;
export const CONTENT_IMPORT_DOWNLOAD_TIMEOUT_MS = 120_000;
export const CONTENT_IMPORT_MAX_REDIRECTS = 5;
export const CONTENT_IMPORT_CONCURRENCY = 2;
export const INSTAGRAM_PUBLIC_IMPORT_MAX_RESOURCES = 10;

export const IMPORT_ERROR_MESSAGES: Record<string, string> = {
  IMPORT_SOURCE_UNSUPPORTED:
    'This source cannot be imported automatically. Connect the account or upload the media directly.',
  IMPORT_PERMISSION_REQUIRED: 'Reconnect this account to grant the required permission.',
  IMPORT_TOKEN_EXPIRED: 'This account token has expired. Please reconnect.',
  IMPORT_MEDIA_NOT_FOUND: 'The requested media was not found on the source platform.',
  IMPORT_MEDIA_TOO_LARGE: 'This media exceeds the maximum allowed file size.',
  IMPORT_DOWNLOAD_FAILED: 'Failed to download media from the source.',
  IMPORT_UPLOAD_FAILED: 'Failed to upload imported media to storage.',
  IMPORT_R2_UPLOAD_FAILED: 'Failed to upload imported media to Cloudflare R2.',
  IMPORT_DUPLICATE: 'This media was already imported.',
  IMPORT_RATE_LIMITED: 'The source platform rate-limited this request. Try again shortly.',
  IMPORT_PLATFORM_ERROR: 'The source platform returned an error.',
  IMPORT_RIGHTS_NOT_CONFIRMED:
    'Confirm that you own this content or have permission to reuse and republish it.',
  INVALID_INSTAGRAM_URL: 'Invalid Instagram URL. Use a reel, post, or IGTV link.',
  INSTAGRAM_PARSE_FAILED: 'Could not parse this Instagram link. It may be private or unavailable.',
  INSTAGRAM_MEDIA_NOT_FOUND: 'No downloadable media found for this Instagram URL.',
  INSTAGRAM_PROVIDER_RATE_LIMIT: 'Instagram download provider rate-limited this request. Try again shortly.',
  INSTAGRAM_PROVIDER_UNAVAILABLE: 'Instagram download provider is temporarily unavailable.',
  INSTAGRAM_DOWNLOAD_EXPIRED: 'Download links expired. Please preview the Instagram link again.',
};
