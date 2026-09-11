import { describe, expect, it } from 'vitest';
import {
  createPostSchema,
  createPostsBatchSchema,
  listPostsQuerySchema,
  retryPostSchema,
} from '../validators/post.validator.js';

describe('createPostSchema', () => {
  it('accepts mediaId + socialAccountIds array', () => {
    const parsed = createPostSchema.parse({
      mediaId: 'abc',
      socialAccountIds: ['def', 'ghi'],
      caption: 'hi',
    });
    expect(parsed.mediaId).toBe('abc');
    expect(parsed.socialAccountIds).toHaveLength(2);
  });

  it('rejects empty socialAccountIds array', () => {
    const result = createPostSchema.safeParse({ mediaId: 'abc', socialAccountIds: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing socialAccountIds', () => {
    const result = createPostSchema.safeParse({ mediaId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects more than 20 accounts', () => {
    const result = createPostSchema.safeParse({
      mediaId: 'abc',
      socialAccountIds: Array.from({ length: 21 }, (_, i) => `id${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional scheduledAt ISO string', () => {
    const parsed = createPostSchema.parse({
      mediaId: 'abc',
      socialAccountIds: ['def'],
      scheduledAt: '2026-12-01T10:00:00.000Z',
      timezone: 'Asia/Kolkata',
    });
    expect(parsed.scheduledAt).toBe('2026-12-01T10:00:00.000Z');
    expect(parsed.timezone).toBe('Asia/Kolkata');
  });

  it('rejects invalid scheduledAt', () => {
    const result = createPostSchema.safeParse({
      mediaId: 'abc',
      socialAccountIds: ['def'],
      scheduledAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('accepts thumbnail and options', () => {
    const parsed = createPostSchema.parse({
      mediaId: 'abc',
      socialAccountIds: ['def'],
      thumbnailMediaId: 'thumb1',
      options: { shareToFeed: true, hideLikeCount: true },
    });
    expect(parsed.thumbnailMediaId).toBe('thumb1');
    expect(parsed.options?.shareToFeed).toBe(true);
  });
});

describe('createPostsBatchSchema', () => {
  it('accepts mediaIds batch', () => {
    const parsed = createPostsBatchSchema.parse({
      mediaIds: ['a', 'b'],
      socialAccountIds: ['acc1'],
      caption: 'batch',
    });
    expect(parsed.mediaIds).toHaveLength(2);
  });

  it('rejects more than 20 mediaIds', () => {
    const result = createPostsBatchSchema.safeParse({
      mediaIds: Array.from({ length: 21 }, (_, i) => `m${i}`),
      socialAccountIds: ['acc1'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty mediaIds', () => {
    const result = createPostsBatchSchema.safeParse({
      mediaIds: [],
      socialAccountIds: ['acc1'],
    });
    expect(result.success).toBe(false);
  });
});

describe('retryPostSchema', () => {
  it('accepts empty body', () => {
    const parsed = retryPostSchema.parse({});
    expect(parsed.destinationIds).toBeUndefined();
  });

  it('accepts destinationIds array', () => {
    const parsed = retryPostSchema.parse({ destinationIds: ['dest1', 'dest2'] });
    expect(parsed.destinationIds).toHaveLength(2);
  });
});

describe('listPostsQuerySchema', () => {
  it('accepts from and to together', () => {
    const parsed = listPostsQuerySchema.parse({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-01T00:00:00.000Z',
      limit: '200',
    });
    expect(parsed.limit).toBe(200);
    expect(parsed.from).toBe('2026-09-01T00:00:00.000Z');
  });

  it('rejects from without to', () => {
    const result = listPostsQuerySchema.safeParse({ from: '2026-09-01T00:00:00.000Z' });
    expect(result.success).toBe(false);
  });
});
