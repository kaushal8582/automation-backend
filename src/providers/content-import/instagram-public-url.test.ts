import { describe, expect, it } from 'vitest';
import {
  assertInstagramMediaUrl,
  isInstagramMediaUrl,
  parseInstagramMediaUrl,
} from './instagram-permalink.js';
import { assertValidInstagramPublicUrl } from './instagram-public-url.provider.js';
import { AppError } from '../../middlewares/error-handler.js';

describe('Instagram public URL parsing', () => {
  it('parses reel, reels, post, and tv URLs', () => {
    expect(parseInstagramMediaUrl('https://www.instagram.com/reel/ABC123/')?.shortcode).toBe(
      'ABC123',
    );
    expect(parseInstagramMediaUrl('https://www.instagram.com/reels/ABC123/')?.kind).toBe('reel');
    expect(parseInstagramMediaUrl('https://www.instagram.com/p/XYZ789/')?.kind).toBe('post');
    expect(parseInstagramMediaUrl('https://www.instagram.com/tv/IGTV01/')?.kind).toBe('tv');
    expect(parseInstagramMediaUrl('https://instagr.am/p/SHORT/')?.shortcode).toBe('SHORT');
  });

  it('rejects invalid URLs', () => {
    expect(isInstagramMediaUrl('https://example.com/reel/x')).toBe(false);
    expect(isInstagramMediaUrl('https://www.instagram.com/username/')).toBe(false);
    expect(() => assertValidInstagramPublicUrl('not-a-url')).toThrow(AppError);
    try {
      assertValidInstagramPublicUrl('https://www.instagram.com/explore/');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('INVALID_INSTAGRAM_URL');
    }
  });

  it('normalizes permalink paths', () => {
    const parsed = assertInstagramMediaUrl('https://www.instagram.com/reels/Hello_World-1/');
    expect(parsed.normalizedUrl).toBe('https://www.instagram.com/reel/Hello_World-1/');
    expect(parsed.providerUrl).toBe('https://www.instagram.com/reel/Hello_World-1/');
  });

  it('keeps share tokens on providerUrl', () => {
    const parsed = parseInstagramMediaUrl(
      'https://www.instagram.com/reel/DdMWWUYIfsx/?stkn=NTc4MTIwNjQ2YQ==&utm_source=ig',
    );
    expect(parsed?.normalizedUrl).toBe('https://www.instagram.com/reel/DdMWWUYIfsx/');
    expect(parsed?.providerUrl).toContain('stkn=');
    expect(parsed?.providerUrl).toContain('DdMWWUYIfsx');
    expect(parsed?.providerUrl).not.toContain('utm_source');
  });
});
