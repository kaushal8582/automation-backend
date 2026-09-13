import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import axios, { type AxiosResponse } from 'axios';
import { Readable } from 'node:stream';
import { AppError } from '../middlewares/error-handler.js';
import {
  CONTENT_IMPORT_DOWNLOAD_TIMEOUT_MS,
  CONTENT_IMPORT_MAX_REDIRECTS,
} from '../constants/content-import.js';
import { env } from '../config/env.js';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
]);

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    if (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80') ||
      normalized.startsWith('::ffff:')
    ) {
      // Map IPv4-mapped IPv6 back to IPv4 when possible
      if (normalized.startsWith('::ffff:')) {
        const mapped = normalized.slice('::ffff:'.length);
        if (isIP(mapped) === 4) return isPrivateOrReservedIp(mapped);
      }
      return true;
    }
    return false;
  }

  const n = ipv4ToInt(ip);
  const ranges: Array<[number, number]> = [
    [ipv4ToInt('0.0.0.0'), ipv4ToInt('0.255.255.255')],
    [ipv4ToInt('10.0.0.0'), ipv4ToInt('10.255.255.255')],
    [ipv4ToInt('100.64.0.0'), ipv4ToInt('100.127.255.255')],
    [ipv4ToInt('127.0.0.0'), ipv4ToInt('127.255.255.255')],
    [ipv4ToInt('169.254.0.0'), ipv4ToInt('169.254.255.255')],
    [ipv4ToInt('172.16.0.0'), ipv4ToInt('172.31.255.255')],
    [ipv4ToInt('192.0.0.0'), ipv4ToInt('192.0.0.255')],
    [ipv4ToInt('192.168.0.0'), ipv4ToInt('192.168.255.255')],
    [ipv4ToInt('198.18.0.0'), ipv4ToInt('198.19.255.255')],
    [ipv4ToInt('224.0.0.0'), ipv4ToInt('255.255.255.255')],
  ];
  return ranges.some(([start, end]) => n >= start && n <= end);
}

export async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError('Invalid media URL', 400, 'IMPORT_SOURCE_UNSUPPORTED');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AppError('Only http/https URLs are allowed', 400, 'IMPORT_SOURCE_UNSUPPORTED');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new AppError('URL host is not allowed', 400, 'IMPORT_SOURCE_UNSUPPORTED');
  }

  const ipVersion = isIP(hostname);
  if (ipVersion) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new AppError('URL resolves to a private address', 400, 'IMPORT_SOURCE_UNSUPPORTED');
    }
    return url;
  }

  let addresses: string[];
  try {
    const result = await lookup(hostname, { all: true });
    addresses = result.map((entry) => entry.address);
  } catch {
    throw new AppError('Unable to resolve media host', 400, 'IMPORT_DOWNLOAD_FAILED');
  }

  if (addresses.length === 0 || addresses.some((addr) => isPrivateOrReservedIp(addr))) {
    throw new AppError('URL resolves to a private address', 400, 'IMPORT_SOURCE_UNSUPPORTED');
  }

  return url;
}

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
export async function safeFetchMediaStream(
  rawUrl: string,
  options?: { maxBytes?: number; timeoutMs?: number; headers?: Record<string, string> },
): Promise<SafeFetchResult> {
  const maxBytes = options?.maxBytes ?? env.MEDIA_MAX_UPLOAD_BYTES;
  const timeoutMs = options?.timeoutMs ?? CONTENT_IMPORT_DOWNLOAD_TIMEOUT_MS;

  let currentUrl = await assertSafeExternalUrl(rawUrl);
  let response: AxiosResponse<Readable> | null = null;

  for (let redirect = 0; redirect <= CONTENT_IMPORT_MAX_REDIRECTS; redirect += 1) {
    try {
      response = await axios.get<Readable>(currentUrl.toString(), {
        responseType: 'stream',
        timeout: timeoutMs,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          Accept: '*/*',
          ...(options?.headers ?? {}),
        },
        // Prevent axios from buffering the whole body for size checks
        maxContentLength: maxBytes,
        maxBodyLength: maxBytes,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status) {
        throw new AppError(
          `Failed to download media (HTTP ${error.response.status})`,
          502,
          'IMPORT_DOWNLOAD_FAILED',
          { status: error.response.status },
        );
      }
      throw new AppError(
        error instanceof Error ? error.message : 'Failed to download media',
        502,
        'IMPORT_DOWNLOAD_FAILED',
      );
    }

    const status = response.status;
    if (status >= 300 && status < 400) {
      const location = response.headers.location;
      // Drain/destroy unused redirect body
      response.data.destroy();
      if (!location || typeof location !== 'string') {
        throw new AppError('Redirect without Location header', 502, 'IMPORT_DOWNLOAD_FAILED');
      }
      if (redirect === CONTENT_IMPORT_MAX_REDIRECTS) {
        throw new AppError('Too many redirects while downloading media', 502, 'IMPORT_DOWNLOAD_FAILED');
      }
      currentUrl = await assertSafeExternalUrl(new URL(location, currentUrl).toString());
      continue;
    }

    break;
  }

  if (!response) {
    throw new AppError('Failed to download media', 502, 'IMPORT_DOWNLOAD_FAILED');
  }

  const contentLengthHeader = response.headers['content-length'];
  const contentLength =
    typeof contentLengthHeader === 'string' ? Number(contentLengthHeader) : undefined;

  if (contentLength !== undefined && Number.isFinite(contentLength) && contentLength > maxBytes) {
    response.data.destroy();
    throw new AppError(
      `File exceeds maximum upload size of ${maxBytes} bytes`,
      400,
      'IMPORT_MEDIA_TOO_LARGE',
      { maxBytes, contentLength },
    );
  }

  const contentTypeHeader = response.headers['content-type'];
  const contentType =
    typeof contentTypeHeader === 'string' ? contentTypeHeader.split(';')[0]?.trim() : undefined;

  // Enforce max size while streaming
  let downloaded = 0;
  const upstream = response.data;
  const guarded = new Readable({
    read() {
      // no-op; we push from upstream
    },
  });

  upstream.on('data', (chunk: Buffer) => {
    downloaded += chunk.length;
    if (downloaded > maxBytes) {
      upstream.destroy();
      guarded.destroy(
        new AppError(
          `File exceeds maximum upload size of ${maxBytes} bytes`,
          400,
          'IMPORT_MEDIA_TOO_LARGE',
          { maxBytes },
        ),
      );
      return;
    }
    guarded.push(chunk);
  });
  upstream.on('end', () => guarded.push(null));
  upstream.on('error', (err) => guarded.destroy(err));

  return {
    stream: guarded,
    contentType,
    contentLength: contentLength && Number.isFinite(contentLength) ? contentLength : undefined,
    finalUrl: currentUrl.toString(),
  };
}
