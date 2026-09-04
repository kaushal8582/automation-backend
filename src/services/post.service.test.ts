import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

const userId = new Types.ObjectId().toString();
const mediaId = new Types.ObjectId();
const accountId1 = new Types.ObjectId();
const accountId2 = new Types.ObjectId();
const postId = new Types.ObjectId();

const mockUserFindById = vi.fn();
const mockMediaFindOne = vi.fn();
const mockAccountFind = vi.fn();
const mockPostCreate = vi.fn();
const mockPostFind = vi.fn();
const mockPostCountDocuments = vi.fn();
const mockPostFindOne = vi.fn();
const mockPostFindByIdAndUpdate = vi.fn();
const mockDestinationInsertMany = vi.fn();
const mockDestinationFind = vi.fn();
const mockQueueAdd = vi.fn();
const mockGetQueue = vi.fn();
const mockResolveUrl = vi.fn();

vi.mock('../models/user.model.js', () => ({
  User: { findById: (...args: unknown[]) => mockUserFindById(...args) },
}));

vi.mock('../models/media-asset.model.js', () => ({
  MediaAsset: { findOne: (...args: unknown[]) => mockMediaFindOne(...args) },
}));

vi.mock('../models/social-account.model.js', () => ({
  SocialAccount: { find: (...args: unknown[]) => mockAccountFind(...args) },
}));

vi.mock('../models/post.model.js', () => ({
  Post: {
    create: (...args: unknown[]) => mockPostCreate(...args),
    find: (...args: unknown[]) => mockPostFind(...args),
    countDocuments: (...args: unknown[]) => mockPostCountDocuments(...args),
    findOne: (...args: unknown[]) => mockPostFindOne(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockPostFindByIdAndUpdate(...args),
  },
}));

vi.mock('../models/post-destination.model.js', () => ({
  PostDestination: {
    insertMany: (...args: unknown[]) => mockDestinationInsertMany(...args),
    find: (...args: unknown[]) => mockDestinationFind(...args),
  },
}));

vi.mock('../config/r2.js', () => ({
  resolveAccessibleMediaUrl: (...args: unknown[]) => mockResolveUrl(...args),
}));

vi.mock('../config/env.js', () => ({
  env: { R2_PUBLIC_URL: 'https://cdn.example.com' },
}));

vi.mock('../queues/publish-destination.queue.js', () => ({
  getPublishDestinationQueue: () => mockGetQueue(),
}));

import { createPost, getPostById, listPosts } from './post.service.js';

function makeAccount(id: Types.ObjectId, overrides: Record<string, unknown> = {}) {
  return { _id: id, id: id.toString(), platformAccountId: `ig-${id.toString().slice(-4)}`, status: 'active', platform: 'instagram', username: 'test', ...overrides };
}

function makePostDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: postId,
    userId,
    mediaId,
    caption: 'hello',
    publishMode: 'now',
    timezone: 'Asia/Kolkata',
    status: 'queued',
    totalDestinations: 2,
    successfulDestinations: 0,
    failedDestinations: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('post.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindById.mockReturnValue({ select: vi.fn().mockResolvedValue({ timezone: 'Asia/Kolkata' }) });
    mockMediaFindOne.mockResolvedValue({
      _id: mediaId,
      r2Key: `users/${userId}/video.mp4`,
      publicUrl: 'https://cdn.example.com/video.mp4',
      status: 'ready',
      type: 'video',
    });
    mockResolveUrl.mockResolvedValue('https://cdn.example.com/video.mp4');
    mockGetQueue.mockReturnValue({ add: mockQueueAdd });
    mockQueueAdd.mockResolvedValue({ id: 'job-1' });
  });

  it('creates post with 2 destinations and enqueues 2 jobs', async () => {
    mockAccountFind.mockResolvedValue([makeAccount(accountId1), makeAccount(accountId2)]);
    const destDocs = [
      { _id: new Types.ObjectId(), postId, socialAccountId: accountId1, platform: 'instagram', status: 'queued', attempts: 0, maxAttempts: 3, createdAt: new Date(), updatedAt: new Date() },
      { _id: new Types.ObjectId(), postId, socialAccountId: accountId2, platform: 'instagram', status: 'queued', attempts: 0, maxAttempts: 3, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockPostCreate.mockResolvedValue(makePostDoc());
    mockDestinationInsertMany.mockResolvedValue(destDocs);

    const result = await createPost(userId, {
      mediaId: mediaId.toString(),
      socialAccountIds: [accountId1.toString(), accountId2.toString()],
      caption: 'hello',
    });

    expect(result.destinations).toHaveLength(2);
    expect(result.post.status).toBe('queued');
    expect(mockQueueAdd).toHaveBeenCalledTimes(2);
  });

  it('rejects if any account is not active', async () => {
    mockAccountFind.mockResolvedValue([
      makeAccount(accountId1),
      makeAccount(accountId2, { status: 'expired' }),
    ]);

    await expect(
      createPost(userId, {
        mediaId: mediaId.toString(),
        socialAccountIds: [accountId1.toString(), accountId2.toString()],
      }),
    ).rejects.toMatchObject({ code: 'SOCIAL_ACCOUNT_INACTIVE' });

    expect(mockPostCreate).not.toHaveBeenCalled();
  });

  it('rejects if fewer accounts found than requested', async () => {
    mockAccountFind.mockResolvedValue([makeAccount(accountId1)]); // only 1 returned

    await expect(
      createPost(userId, {
        mediaId: mediaId.toString(),
        socialAccountIds: [accountId1.toString(), accountId2.toString()],
      }),
    ).rejects.toMatchObject({ code: 'SOCIAL_ACCOUNT_NOT_FOUND' });
  });

  it('lists posts for user', async () => {
    mockPostFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makePostDoc({ status: 'published' })]),
        }),
      }),
    });
    mockPostCountDocuments.mockResolvedValue(1);

    const result = await listPosts(userId, { limit: 10, offset: 0 });
    expect(result.total).toBe(1);
    expect(result.posts[0]?.status).toBe('published');
  });

  it('gets post by id with destinations', async () => {
    mockPostFindOne.mockResolvedValue(makePostDoc({ status: 'published' }));
    mockDestinationFind.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        { _id: new Types.ObjectId(), postId, socialAccountId: accountId1, platform: 'instagram', status: 'published', platformPostId: 'post-1', attempts: 1, maxAttempts: 3, createdAt: new Date(), updatedAt: new Date() },
      ]),
    });

    const result = await getPostById(userId, postId.toString());
    expect(result.post.id).toBe(postId.toString());
    expect(result.destinations[0]?.platformPostId).toBe('post-1');
  });
});
