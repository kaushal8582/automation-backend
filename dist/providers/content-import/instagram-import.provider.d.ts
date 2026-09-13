import type { AxiosInstance } from 'axios';
import type { ContentImportProvider, ExternalMediaItem, GetMediaDetailsInput, ListMediaInput, ListMediaResult, ResolveMediaSourceInput, ResolvedMediaSource } from './types.js';
/**
 * Lists / resolves media from a connected Instagram account via the official Graph API.
 * Uses only fields the API returns — does not scrape or invent URLs.
 */
export declare class InstagramImportProvider implements ContentImportProvider {
    readonly platform: "instagram";
    private readonly client;
    constructor(client?: AxiosInstance);
    listMedia(input: ListMediaInput): Promise<ListMediaResult>;
    getMediaDetails(input: GetMediaDetailsInput): Promise<ExternalMediaItem>;
    resolveMediaSource(input: ResolveMediaSourceInput): Promise<ResolvedMediaSource>;
}
//# sourceMappingURL=instagram-import.provider.d.ts.map