/**
 * Future-ready public URL import providers (Instagram, YouTube, TikTok, …).
 * Distinct from connected-account Graph API providers.
 */
export type PublicImportResourceType = 'video' | 'image' | 'audio';
export type PublicImportResource = {
    id: string;
    type: PublicImportResourceType;
    format: string;
    quality: string;
    size: number;
    downloadUrl: string;
    downloadMode?: string;
    /** Opaque provider payload used to resolve downloadUrl when missing (never expose to clients). */
    resourceContent?: string;
};
export type PublicUrlParseResult = {
    sourceUrl: string;
    sourcePlatform: string;
    externalId: string;
    title: string;
    caption: string;
    thumbnail?: string;
    duration?: string;
    durationSeconds?: number;
    resources: PublicImportResource[];
};
export interface PublicUrlImportProvider {
    readonly platform: string;
    canHandle(url: string): boolean;
    parse(url: string): Promise<PublicUrlParseResult>;
}
//# sourceMappingURL=public-url.types.d.ts.map