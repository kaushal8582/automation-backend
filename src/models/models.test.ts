import { describe, expect, it } from 'vitest';
import {
  MediaAsset,
  Post,
  PostDestination,
  SocialAccount,
  SocialPostMetrics,
  User,
} from '../models/index.js';

describe('mongoose models', () => {
  it('registers all Phase 3 models', () => {
    expect(User.modelName).toBe('User');
    expect(SocialAccount.modelName).toBe('SocialAccount');
    expect(MediaAsset.modelName).toBe('MediaAsset');
    expect(Post.modelName).toBe('Post');
    expect(PostDestination.modelName).toBe('PostDestination');
    expect(SocialPostMetrics.modelName).toBe('SocialPostMetrics');
  });

  it('defines expected SocialAccount indexes', () => {
    const indexes = SocialAccount.schema.indexes();
    const hasUniquePlatformAccount = indexes.some(
      ([fields, options]) =>
        Boolean(fields.userId) &&
        Boolean(fields.platform) &&
        Boolean(fields.platformAccountId) &&
        options?.unique === true,
    );
    expect(hasUniquePlatformAccount).toBe(true);
  });

  it('defines PostDestination postId + status/scheduledAt indexes', () => {
    const indexes = PostDestination.schema.indexes();
    const hasStatusScheduled = indexes.some(
      ([fields]) => Boolean(fields.status) && Boolean(fields.scheduledAt),
    );
    expect(hasStatusScheduled).toBe(true);
  });
});
