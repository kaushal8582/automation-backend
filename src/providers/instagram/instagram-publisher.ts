import type { AxiosInstance } from 'axios';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/error-handler.js';
import { createLogger } from '../../utils/logger.js';
import { maskToken } from '../../utils/encryption.js';
import { createInstagramGraphClient } from '../meta/meta-client.js';
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

const logger = createLogger('instagram-publisher');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type InstagramPublisherOptions = {
  client?: AxiosInstance;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
};

/**
 * Official Instagram API with Instagram Login — Reels publishing.
 * Flow: create container → poll until FINISHED → media_publish.
 */
export class InstagramPublisher implements SocialPublisher {
  private readonly client: AxiosInstance;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(options: InstagramPublisherOptions = {}) {
    this.client = options.client ?? createInstagramGraphClient();
    this.pollIntervalMs = options.pollIntervalMs ?? env.IG_MEDIA_POLL_INTERVAL_MS;
    this.maxPollAttempts = options.maxPollAttempts ?? env.IG_MEDIA_POLL_MAX_ATTEMPTS;
  }

  async createMediaContainer(
    input: CreateMediaContainerInput,
  ): Promise<CreateMediaContainerResult> {
    try {
      logger.info('Creating IG media container', {
        platformAccountId: input.platformAccountId,
        token: maskToken(input.accessToken),
        apiVersion: env.META_GRAPH_API_VERSION,
      });

      const { data } = await this.client.post<{ id: string }>(
        `/${input.platformAccountId}/media`,
        null,
        {
          params: {
            media_type: 'REELS',
            video_url: input.videoUrl,
            caption: input.caption ?? '',
            access_token: input.accessToken,
          },
        },
      );

      if (!data?.id) {
        throw new AppError('Instagram did not return a creation id', 502, 'META_API_ERROR');
      }

      return { platformContainerId: data.id };
    } catch (error) {
      throw normalizeMetaError(error);
    }
  }

  async checkMediaStatus(input: CheckMediaStatusInput): Promise<CheckMediaStatusResult> {
    try {
      const { data } = await this.client.get<{ status_code?: string; status?: string }>(
        `/${input.platformContainerId}`,
        {
          params: {
            fields: 'status_code,status',
            access_token: input.accessToken,
          },
        },
      );

      return {
        statusCode: data.status_code ?? 'IN_PROGRESS',
        status: data.status,
      };
    } catch (error) {
      throw normalizeMetaError(error);
    }
  }

  /**
   * Poll until FINISHED (or ERROR/EXPIRED/timeout).
   * First check after pollIntervalMs, then every pollIntervalMs.
   */
  async waitUntilContainerReady(input: CheckMediaStatusInput): Promise<CheckMediaStatusResult> {
    for (let attempt = 1; attempt <= this.maxPollAttempts; attempt += 1) {
      await sleep(this.pollIntervalMs);
      const status = await this.checkMediaStatus(input);

      logger.info('IG container status', {
        platformContainerId: input.platformContainerId,
        statusCode: status.statusCode,
        attempt,
      });

      if (status.statusCode === 'FINISHED') {
        return status;
      }

      if (status.statusCode === 'ERROR' || status.statusCode === 'EXPIRED') {
        throw new AppError(
          `Instagram media processing failed: ${status.statusCode}`,
          502,
          'META_MEDIA_PROCESSING_FAILED',
          { status: status.status, statusCode: status.statusCode },
        );
      }
    }

    throw new AppError(
      'Instagram media processing timed out before FINISHED',
      504,
      'META_MEDIA_PROCESSING_FAILED',
      { maxPollAttempts: this.maxPollAttempts, pollIntervalMs: this.pollIntervalMs },
    );
  }

  async publishMedia(input: PublishMediaInput): Promise<PublishMediaResult> {
    try {
      const { data } = await this.client.post<{ id: string }>(
        `/${input.platformAccountId}/media_publish`,
        null,
        {
          params: {
            creation_id: input.platformContainerId,
            access_token: input.accessToken,
          },
        },
      );

      if (!data?.id) {
        throw new AppError('Instagram did not return a published media id', 502, 'META_API_ERROR');
      }

      return { platformPostId: data.id };
    } catch (error) {
      throw normalizeMetaError(error);
    }
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
    // Long-lived IG token refresh is handled later via MetaTokenService / OAuth phase.
    return false;
  }

  /**
   * Full publish pipeline for one Reel.
   * Persisting platformContainerId / platformPostId is the caller's responsibility
   * (destination records in later phases).
   */
  async publishReel(input: CreateMediaContainerInput): Promise<{
    platformContainerId: string;
    platformPostId: string;
  }> {
    const { platformContainerId } = await this.createMediaContainer(input);
    await this.waitUntilContainerReady({
      platformContainerId,
      accessToken: input.accessToken,
    });
    const { platformPostId } = await this.publishMedia({
      platformAccountId: input.platformAccountId,
      platformContainerId,
      accessToken: input.accessToken,
    });
    return { platformContainerId, platformPostId };
  }
}
