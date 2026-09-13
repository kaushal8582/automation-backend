import type { SocialPlatform } from '../../types/domain.js';
export type ExternalMediaType = 'video' | 'image' | 'reel' | 'carousel' | 'story' | string;
export type ExternalMediaItem = {
    externalId: string;
    platform: SocialPlatform | 'url';
    accountId: string;
    mediaType: ExternalMediaType;
    thumbnailUrl?: string;
    sourceUrl?: string;
    caption?: string;
    createdAt?: string;
    duration?: number;
    permalink?: string;
    metadata?: Record<string, unknown>;
    /** True when this user already imported this external item */
    alreadyImported?: boolean;
    existingMediaId?: string;
};
export type ResolvedMediaSource = {
    directUrl: string;
    mimeType?: string;
    filename?: string;
    expiresAt?: string;
    thumbnailUrl?: string;
    fileSizeHint?: number;
};
export type ListMediaInput = {
    userId: string;
    socialAccountId: string;
    platformAccountId: string;
    accessToken: string;
    limit?: number;
    cursor?: string;
};
export type ListMediaResult = {
    items: ExternalMediaItem[];
    nextCursor?: string;
};
export type GetMediaDetailsInput = {
    userId: string;
    socialAccountId: string;
    platformAccountId: string;
    accessToken: string;
    externalId: string;
};
export type ResolveMediaSourceInput = {
    userId: string;
    socialAccountId: string;
    platformAccountId: string;
    accessToken: string;
    externalId: string;
    item?: ExternalMediaItem;
};
export interface ContentImportProvider {
    readonly platform: SocialPlatform;
    listMedia(input: ListMediaInput): Promise<ListMediaResult>;
    getMediaDetails(input: GetMediaDetailsInput): Promise<ExternalMediaItem>;
    resolveMediaSource(input: ResolveMediaSourceInput): Promise<ResolvedMediaSource>;
}
export type UrlImportPreview = {
    url: string;
    mediaType: ExternalMediaType;
    mimeType?: string;
    filename?: string;
    thumbnailUrl?: string;
    caption?: string;
    fileSizeHint?: number;
    /** Present when an Instagram permalink was matched to a connected account */
    platform?: SocialPlatform | 'url';
    shortcode?: string;
    permalink?: string;
    externalId?: string;
    socialAccountId?: string;
    accountLabel?: string;
    alreadyImported?: boolean;
    existingMediaId?: string;
};
export interface UrlImportAdapter {
    readonly id: string;
    canHandle(url: string): boolean;
    preview(url: string): Promise<UrlImportPreview>;
    resolve(url: string): Promise<ResolvedMediaSource>;
}
//# sourceMappingURL=types.d.ts.map