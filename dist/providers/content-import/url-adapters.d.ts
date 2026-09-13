import type { ResolvedMediaSource, UrlImportAdapter, UrlImportPreview } from './types.js';
/**
 * Imports only direct public media CDN/file URLs (mp4/mov/jpeg/png/webp).
 * Does NOT claim Instagram/Facebook post-page URL support.
 */
export declare class DirectMediaUrlAdapter implements UrlImportAdapter {
    readonly id = "direct-media-url";
    canHandle(url: string): boolean;
    preview(url: string): Promise<UrlImportPreview>;
    resolve(url: string): Promise<ResolvedMediaSource>;
}
export declare function getUrlImportAdapters(): UrlImportAdapter[];
export declare function findUrlImportAdapter(url: string): UrlImportAdapter | null;
//# sourceMappingURL=url-adapters.d.ts.map