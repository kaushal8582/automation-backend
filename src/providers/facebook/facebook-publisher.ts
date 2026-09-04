import type { AxiosInstance } from 'axios';
import { AppError } from '../../middlewares/error-handler.js';
import { createLogger } from '../../utils/logger.js';
import { maskToken } from '../../utils/encryption.js';
import { createFacebookGraphClient } from '../meta/meta-client.js';
import { normalizeMetaError } from '../meta/meta-errors.js';
import type {
  CheckMediaStatusInput,
  CheckMediaStatusResult,
  CreateMediaContainerInput,
  CreateMediaContainerResult,
  GetPostStatusInput,
  GetPostStatusResult,
  PublishMediaInput,
  PublishMediaResult,
  SocialPublisher,
} from '../social-publisher.js';

const logger = createLogger('facebook-publisher');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type FacebookPublisherOptions = {
  client?: AxiosInstance;
  /** Poll interval in ms while FB transcodes the video (default 5 s) */
  pollIntervalMs?: number;
  /** Max poll attempts (default 36 — 3 min) */
  maxPollAttempts?: number;
};

/**
 * Facebook Pages video publishing via Graph API.
 *
 * Flow:
 *   1. POST /{page-id}/videos — non-blocking upload (returns video_id)
 *   2. Poll GET /{video-id}?fields=status until status.video_status === 'ready'
 *   3. No separate "publish" call needed — the video posts go live automatically
 *      once transcoding finishes (or we set `published=true` in step 1).
 *
 * We map the FB flow onto the SocialPublisher interface:
 *   - createMediaContainer  → upload video, get video_id (container)
 *   - checkMediaStatus      → poll transcoding status
 *   - publishMedia          → no-op (video was published at upload time)
 */
export class FacebookPublisher implements SocialPublisher {
  private readonly client: AxiosInstance;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(options: FacebookPublisherOptions = {}) {
    this.client = options.client ?? createFacebookGraphClient();
    this.pollIntervalMs = options.pollIntervalMs ?? 5_000;
    this.maxPollAttempts = options.maxPollAttempts ?? 36;
  }

  /**
   * Upload video to the Facebook Page.
   * `platformAccountId` is the Facebook Page ID.
   * Returns the FB video ID as `platformContainerId`.
   */
  async createMediaContainer(
    input: CreateMediaContainerInput,
  ): Promise<CreateMediaContainerResult> {
    try {
      logger.info('Uploading video to Facebook Page', {
        pageId: input.platformAccountId,
        token: maskToken(input.accessToken),
      });

      const { data } = await this.client.post<{ id: string }>(
        `/${input.platformAccountId}/videos`,
        null,
        {
          params: {
            file_url: input.videoUrl,
            description: input.caption ?? '',
            published: true,
            access_token: input.accessToken,
          },
        },
      );

      if (!data?.id) {
        throw new AppError('Facebook did not return a video id', 502, 'META_API_ERROR');
      }

      logger.info('Facebook video uploaded', { videoId: data.id });
      return { platformContainerId: data.id };
    } catch (error) {
      throw normalizeMetaError(error);
    }
  }

  /** Poll the video transcoding status. */
  async checkMediaStatus(input: CheckMediaStatusInput): Promise<CheckMediaStatusResult> {
    try {
      const { data } = await this.client.get<{
        status?: { video_status?: string; processing_progress?: number };
      }>(`/${input.platformContainerId}`, {
        params: {
          fields: 'status',
          access_token: input.accessToken,
        },
      });

      const videoStatus = data.status?.video_status ?? 'processing';

      // Map FB video_status → our internal status codes
      const statusCode =
        videoStatus === 'ready'
          ? 'FINISHED'
          : videoStatus === 'error'
            ? 'ERROR'
            : 'IN_PROGRESS';

      return { statusCode, status: videoStatus };
    } catch (error) {
      throw normalizeMetaError(error);
    }
  }

  /** Poll until the video is ready (transcoded). */
  async waitUntilVideoReady(input: CheckMediaStatusInput): Promise<CheckMediaStatusResult> {
    for (let attempt = 1; attempt <= this.maxPollAttempts; attempt += 1) {
      await sleep(this.pollIntervalMs);
      const status = await this.checkMediaStatus(input);

      logger.info('FB video status', {
        videoId: input.platformContainerId,
        statusCode: status.statusCode,
        attempt,
      });

      if (status.statusCode === 'FINISHED') return status;
      if (status.statusCode === 'ERROR') {
        throw new AppError(
          `Facebook video processing failed: ${status.status ?? 'error'}`,
          502,
          'META_MEDIA_PROCESSING_FAILED',
          { status: status.status, statusCode: status.statusCode },
        );
      }
    }

    throw new AppError(
      'Facebook video processing timed out',
      504,
      'META_MEDIA_PROCESSING_FAILED',
      { maxPollAttempts: this.maxPollAttempts, pollIntervalMs: this.pollIntervalMs },
    );
  }

  /**
   * No-op for Facebook — video is published when uploaded with `published=true`.
   * We still poll for "ready" in `waitUntilVideoReady`, but there's no separate
   * publish step. Returns the same videoId as the platformPostId.
   */
  async publishMedia(input: PublishMediaInput): Promise<PublishMediaResult> {
    // The video was already published during createMediaContainer.
    // platformContainerId === FB video id === published post id.
    return { platformPostId: input.platformContainerId };
  }

  async getPostStatus(input: GetPostStatusInput): Promise<GetPostStatusResult> {
    try {
      const { data } = await this.client.get<{ id: string }>(`/${input.platformPostId}`, {
        params: {
          fields: 'id',
          access_token: input.accessToken,
        },
      });
      return { id: data.id, raw: data };
    } catch (error) {
      throw normalizeMetaError(error);
    }
  }

  async refreshCredentialsIfSupported(): Promise<boolean> {
    return false;
  }

  /** Full publish pipeline for one FB video post. */
  async publishVideo(input: CreateMediaContainerInput): Promise<{
    platformContainerId: string;
    platformPostId: string;
  }> {
    const { platformContainerId } = await this.createMediaContainer(input);
    await this.waitUntilVideoReady({
      platformContainerId,
      accessToken: input.accessToken,
    });
    // publishMedia is a no-op; video id == post id
    const { platformPostId } = await this.publishMedia({
      platformAccountId: input.platformAccountId,
      platformContainerId,
      accessToken: input.accessToken,
    });
    return { platformContainerId, platformPostId };
  }
}
