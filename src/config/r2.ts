import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env.js';

let s3Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
      // Required for browser presigned PUTs — newer AWS SDK signs CRC32 checksums
      // that XMLHttpRequest/fetch will not send, which causes R2 403 SignatureDoesNotMatch.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return s3Client;
}

export function getR2Bucket(): string {
  return env.R2_BUCKET;
}

export function hasPublicR2BaseUrl(): boolean {
  return Boolean(env.R2_PUBLIC_URL);
}

/** Stable public URL when R2_PUBLIC_URL / custom domain is configured. */
export function buildPublicUrl(r2Key: string): string {
  if (!env.R2_PUBLIC_URL) {
    return '';
  }
  const base = env.R2_PUBLIC_URL.replace(/\/$/, '');
  const key = r2Key.replace(/^\//, '');
  return `${base}/${key}`;
}

/** Fresh GET URL for private buckets (when no public base URL). */
export async function createPresignedGetUrl(
  r2Key: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getR2Bucket(),
    Key: r2Key,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: expiresInSeconds });
}

export async function resolveAccessibleMediaUrl(r2Key: string, storedPublicUrl?: string): Promise<string> {
  if (storedPublicUrl && storedPublicUrl.startsWith('http')) {
    return storedPublicUrl;
  }
  if (env.R2_PUBLIC_URL) {
    return buildPublicUrl(r2Key);
  }
  return createPresignedGetUrl(r2Key);
}

export function isR2ConfiguredForRealUploads(): boolean {
  const placeholders = new Set(['REPLACE_ME', 'changeme', 'your-key']);
  return (
    Boolean(env.R2_ENDPOINT) &&
    Boolean(env.R2_BUCKET) &&
    !placeholders.has(env.R2_ACCESS_KEY_ID) &&
    !placeholders.has(env.R2_SECRET_ACCESS_KEY)
  );
}
