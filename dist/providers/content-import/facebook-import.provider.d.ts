import type { AxiosInstance } from 'axios';
import type { ContentImportProvider, ExternalMediaItem, GetMediaDetailsInput, ListMediaInput, ListMediaResult, ResolveMediaSourceInput, ResolvedMediaSource } from './types.js';
/**
 * Lists / resolves videos from a connected Facebook Page via the official Graph API.
 * Requires existing page token permissions (e.g. pages_read_engagement).
 */
export declare class FacebookImportProvider implements ContentImportProvider {
    readonly platform: "facebook";
    private readonly client;
    constructor(client?: AxiosInstance);
    listMedia(input: ListMediaInput): Promise<ListMediaResult>;
    getMediaDetails(input: GetMediaDetailsInput): Promise<ExternalMediaItem>;
    resolveMediaSource(input: ResolveMediaSourceInput): Promise<ResolvedMediaSource>;
}
//# sourceMappingURL=facebook-import.provider.d.ts.map