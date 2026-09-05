import { S3Client } from '@aws-sdk/client-s3';
export declare function getR2Client(): S3Client;
export declare function getR2Bucket(): string;
export declare function hasPublicR2BaseUrl(): boolean;
/** Stable public URL when R2_PUBLIC_URL / custom domain is configured. */
export declare function buildPublicUrl(r2Key: string): string;
/** Fresh GET URL for private buckets (when no public base URL). */
export declare function createPresignedGetUrl(r2Key: string, expiresInSeconds?: number): Promise<string>;
export declare function resolveAccessibleMediaUrl(r2Key: string, storedPublicUrl?: string): Promise<string>;
export declare function isR2ConfiguredForRealUploads(): boolean;
//# sourceMappingURL=r2.d.ts.map