import { describe, expect, it } from 'vitest';
import {
  assertAllowedMimeType,
  assertUploadSize,
  buildObjectKey,
  resolveMediaType,
  validateMediaMetadata,
} from '../services/media-validation.service.js';
import { AppError } from '../middlewares/error-handler.js';

describe('media validation', () => {
  it('accepts allowed video mime types', () => {
    expect(() => assertAllowedMimeType('video/mp4')).not.toThrow();
  });

  it('rejects unsupported mime types', () => {
    expect(() => assertAllowedMimeType('application/pdf')).toThrow(AppError);
  });

  it('rejects oversized uploads', () => {
    expect(() => assertUploadSize(Number.MAX_SAFE_INTEGER)).toThrow(AppError);
  });

  it('builds unique object keys under users/{userId}/…', () => {
    const key = buildObjectKey('abc123', 'video/mp4', 'video');
    expect(key.startsWith('users/abc123/videos/')).toBe(true);
    expect(key.endsWith('.mp4')).toBe(true);
    expect(key.includes('my-video.mp4')).toBe(false);
  });

  it('resolves thumbnail type for images', () => {
    expect(resolveMediaType('image/jpeg', 'thumbnail')).toBe('thumbnail');
  });

  it('validates metadata without reading file bytes', async () => {
    await expect(
      validateMediaMetadata({
        mimeType: 'video/mp4',
        fileSize: 1024,
        duration: 12,
      }),
    ).resolves.toBeUndefined();
  });

  it('resolves audio mime types', () => {
    expect(resolveMediaType('audio/mpeg')).toBe('audio');
    expect(resolveMediaType('audio/mp4', 'audio')).toBe('audio');
  });

  it('builds audio object keys under users/{userId}/audio/…', () => {
    const key = buildObjectKey('abc123', 'audio/mpeg', 'audio');
    expect(key.startsWith('users/abc123/audio/')).toBe(true);
    expect(key.endsWith('.mp3')).toBe(true);
  });
});
