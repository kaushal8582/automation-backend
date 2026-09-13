import type { PublicImportResource } from './public-url.types.js';
type RawProviderResource = Record<string, unknown>;
/**
 * Some IG resources (especially audio) return empty download_url and only
 * resource_content. Resolve them via the provider download_url + progress APIs.
 */
export declare function resolveProviderDownloadUrl(raw: RawProviderResource): Promise<string | undefined>;
export declare function ensureResourceDownloadUrl(resource: PublicImportResource, rawHint?: RawProviderResource): Promise<PublicImportResource>;
export {};
//# sourceMappingURL=ig-resource-resolve.d.ts.map