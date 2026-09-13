import { Readable } from 'node:stream';
export declare function assertSafeExternalUrl(rawUrl: string): Promise<URL>;
export type SafeFetchResult = {
    stream: Readable;
    contentType?: string;
    contentLength?: number;
    finalUrl: string;
};
/**
 * Safely fetch a remote media URL with SSRF protections, redirect limits,
 * timeouts, and max size. Returns a readable stream (does not buffer the body).
 */
export declare function safeFetchMediaStream(rawUrl: string, options?: {
    maxBytes?: number;
    timeoutMs?: number;
    headers?: Record<string, string>;
}): Promise<SafeFetchResult>;
//# sourceMappingURL=safe-fetch.d.ts.map