import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { InstagramPublisher } from './instagram-publisher.js';
import { AppError } from '../../middlewares/error-handler.js';

function createMockClient() {
  return {
    post: vi.fn(),
    get: vi.fn(),
  } as unknown as AxiosInstance & { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
}

describe('InstagramPublisher', () => {
  const accessToken = 'IGQWtest-token';
  const platformAccountId = '17841400000000000';
  let client: ReturnType<typeof createMockClient>;
  let publisher: InstagramPublisher;

  beforeEach(() => {
    client = createMockClient();
    publisher = new InstagramPublisher({
      client,
      pollIntervalMs: 1,
      maxPollAttempts: 5,
    });
  });

  it('creates a REELS media container', async () => {
    client.post.mockResolvedValueOnce({ data: { id: 'creation_123' } });

    const result = await publisher.createMediaContainer({
      platformAccountId,
      accessToken,
      videoUrl: 'https://media.example.com/video.mp4',
      caption: 'Hello Reel',
    });

    expect(result.platformContainerId).toBe('creation_123');
    expect(client.post).toHaveBeenCalledWith(
      `/${platformAccountId}/media`,
      null,
      expect.objectContaining({
        params: expect.objectContaining({
          media_type: 'REELS',
          video_url: 'https://media.example.com/video.mp4',
          caption: 'Hello Reel',
          access_token: accessToken,
        }),
      }),
    );
  });

  it('polls until FINISHED then publishes', async () => {
    client.post
      .mockResolvedValueOnce({ data: { id: 'creation_456' } })
      .mockResolvedValueOnce({ data: { id: 'published_789' } });

    client.get
      .mockResolvedValueOnce({ data: { status_code: 'IN_PROGRESS' } })
      .mockResolvedValueOnce({ data: { status_code: 'FINISHED', status: 'ok' } });

    const result = await publisher.publishReel({
      platformAccountId,
      accessToken,
      videoUrl: 'https://media.example.com/video.mp4',
      caption: 'Ship it',
    });

    expect(result).toEqual({
      platformContainerId: 'creation_456',
      platformPostId: 'published_789',
    });
    expect(client.get).toHaveBeenCalled();
    expect(client.post).toHaveBeenLastCalledWith(
      `/${platformAccountId}/media_publish`,
      null,
      expect.objectContaining({
        params: {
          creation_id: 'creation_456',
          access_token: accessToken,
        },
      }),
    );
  });

  it('throws META_MEDIA_PROCESSING_FAILED on ERROR status', async () => {
    client.get.mockResolvedValueOnce({ data: { status_code: 'ERROR', status: 'failed' } });

    await expect(
      publisher.waitUntilContainerReady({
        platformContainerId: 'creation_err',
        accessToken,
      }),
    ).rejects.toMatchObject({
      code: 'META_MEDIA_PROCESSING_FAILED',
    } satisfies Partial<AppError>);
  });

  it('times out when never FINISHED', async () => {
    client.get.mockResolvedValue({ data: { status_code: 'IN_PROGRESS' } });

    await expect(
      publisher.waitUntilContainerReady({
        platformContainerId: 'creation_slow',
        accessToken,
      }),
    ).rejects.toMatchObject({
      code: 'META_MEDIA_PROCESSING_FAILED',
    });
  });
});
