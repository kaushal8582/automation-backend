import { describe, expect, it } from 'vitest';
import { DirectMediaUrlAdapter, findUrlImportAdapter } from './url-adapters.js';
import {
  isInstagramMediaUrl,
  parseInstagramMediaUrl,
  permalinkContainsShortcode,
} from './instagram-permalink.js';
import { assertSafeExternalUrl } from '../../utils/safe-fetch.js';
import { ContentImportJob, MediaAsset } from '../../models/index.js';

describe('url import adapters', () => {
  const adapter = new DirectMediaUrlAdapter();

  it('handles direct mp4 urls', () => {
    expect(adapter.canHandle('https://cdn.example.com/path/video.mp4')).toBe(true);
    expect(adapter.canHandle('https://cdn.example.com/path/clip.mov?token=1')).toBe(true);
  });

  it('does not treat instagram post pages as direct media urls', () => {
    expect(adapter.canHandle('https://www.instagram.com/reel/ABC123/')).toBe(false);
    expect(findUrlImportAdapter('https://www.instagram.com/p/ABC123/')).toBeNull();
  });

  it('rejects non-media urls', () => {
    expect(adapter.canHandle('https://example.com/page')).toBe(false);
  });
});

describe('instagram permalink parser', () => {
  it('parses reel, reels, post, and tv urls', () => {
    expect(parseInstagramMediaUrl('https://www.instagram.com/reel/AbC_123/')?.shortcode).toBe(
      'AbC_123',
    );
    expect(parseInstagramMediaUrl('https://www.instagram.com/reels/AbC_123/')?.kind).toBe('reel');
    expect(parseInstagramMediaUrl('https://instagram.com/p/PostCode99/?igsh=xyz')?.shortcode).toBe(
      'PostCode99',
    );
    expect(parseInstagramMediaUrl('https://www.instagram.com/tv/TvCode/')?.kind).toBe('tv');
    expect(isInstagramMediaUrl('https://www.instagram.com/reel/AbC_123/')).toBe(true);
  });

  it('rejects non-instagram urls', () => {
    expect(parseInstagramMediaUrl('https://cdn.example.com/video.mp4')).toBeNull();
    expect(parseInstagramMediaUrl('https://www.instagram.com/username/')).toBeNull();
  });

  it('matches shortcodes inside permalinks', () => {
    expect(
      permalinkContainsShortcode('https://www.instagram.com/reel/AbC_123/', 'AbC_123'),
    ).toBe(true);
    expect(
      permalinkContainsShortcode('https://www.instagram.com/reel/Other/', 'AbC_123'),
    ).toBe(false);
  });
});

describe('safe external url guard', () => {
  it('rejects non-http protocols', async () => {
    await expect(assertSafeExternalUrl('file:///etc/passwd')).rejects.toMatchObject({
      code: 'IMPORT_SOURCE_UNSUPPORTED',
    });
  });

  it('rejects localhost', async () => {
    await expect(assertSafeExternalUrl('http://localhost/video.mp4')).rejects.toMatchObject({
      code: 'IMPORT_SOURCE_UNSUPPORTED',
    });
  });

  it('rejects private ipv4', async () => {
    await expect(assertSafeExternalUrl('http://127.0.0.1/video.mp4')).rejects.toMatchObject({
      code: 'IMPORT_SOURCE_UNSUPPORTED',
    });
    await expect(assertSafeExternalUrl('http://10.0.0.5/video.mp4')).rejects.toMatchObject({
      code: 'IMPORT_SOURCE_UNSUPPORTED',
    });
  });
});

describe('content import models', () => {
  it('registers ContentImportJob model', () => {
    expect(ContentImportJob.modelName).toBe('ContentImportJob');
  });

  it('defines duplicate-protection index on MediaAsset', () => {
    const indexes = MediaAsset.schema.indexes();
    const hasSourceUnique = indexes.some(
      ([fields, options]) =>
        Boolean(fields.userId) &&
        Boolean(fields.sourcePlatform) &&
        Boolean(fields.sourceExternalId) &&
        options?.unique === true,
    );
    expect(hasSourceUnique).toBe(true);
  });
});
