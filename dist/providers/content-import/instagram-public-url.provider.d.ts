import type { PublicImportResource, PublicUrlImportProvider, PublicUrlParseResult } from './public-url.types.js';
export declare class InstagramPublicUrlImportProvider implements PublicUrlImportProvider {
    readonly platform = "instagram";
    canHandle(url: string): boolean;
    parse(url: string): Promise<PublicUrlParseResult>;
    /**
     * Re-parse and resolve selected resource IDs server-side (never trust client download URLs).
     */
    resolveResources(url: string, resourceIds: string[]): Promise<{
        parsed: PublicUrlParseResult;
        selected: PublicImportResource[];
    }>;
}
export declare const instagramPublicUrlImportProvider: InstagramPublicUrlImportProvider;
export declare function getPublicUrlImportProvider(url: string): PublicUrlImportProvider | null;
/** Validate Instagram public URL or throw INVALID_INSTAGRAM_URL */
export declare function assertValidInstagramPublicUrl(url: string): import("./instagram-permalink.js").ParsedInstagramPermalink;
//# sourceMappingURL=instagram-public-url.provider.d.ts.map