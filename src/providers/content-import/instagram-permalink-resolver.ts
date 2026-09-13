import { Types } from 'mongoose';
import { AppError } from '../../middlewares/error-handler.js';
import { SocialAccount, type ISocialAccountDocument } from '../../models/social-account.model.js';
import { MediaAsset } from '../../models/media-asset.model.js';
import { metaTokenService } from '../../services/meta-token.service.js';
import { createLogger } from '../../utils/logger.js';
import { getContentImportProvider } from './index.js';
import {
  assertInstagramMediaUrl,
  permalinkContainsShortcode,
  type ParsedInstagramPermalink,
} from './instagram-permalink.js';
import type { ExternalMediaItem } from './types.js';

const logger = createLogger('instagram-permalink-resolver');

/** Max Graph pages to scan per account when resolving a pasted permalink. */
const MAX_PAGES_PER_ACCOUNT = 20;
const PAGE_SIZE = 50;

export type ResolvedOwnedInstagramMedia = {
  parsed: ParsedInstagramPermalink;
  account: {
    id: string;
    platformAccountId: string;
    username?: string;
    displayName?: string;
  };
  item: ExternalMediaItem;
  alreadyImported: boolean;
  existingMediaId?: string;
};

/**
 * Resolve a pasted Instagram reel/post URL to media owned by one of the user's
 * connected Instagram accounts via the official Graph API.
 *
 * Does NOT scrape Instagram HTML or download third-party public reels.
 */
export async function resolveOwnedInstagramPermalink(
  userId: string,
  rawUrl: string,
  options?: { socialAccountId?: string },
): Promise<ResolvedOwnedInstagramMedia> {
  const parsed = assertInstagramMediaUrl(rawUrl);

  const accountQuery: Record<string, unknown> = {
    userId,
    platform: 'instagram',
    status: 'active',
  };

  if (options?.socialAccountId) {
    if (!Types.ObjectId.isValid(options.socialAccountId)) {
      throw new AppError('Invalid social account id', 400, 'INVALID_SOCIAL_ACCOUNT_ID');
    }
    accountQuery._id = options.socialAccountId;
  }

  const accounts = (await SocialAccount.find(accountQuery).sort({
    createdAt: -1,
  })) as ISocialAccountDocument[];

  if (accounts.length === 0) {
    throw new AppError(
      'Connect the Instagram account that owns this reel, then paste the link again. Third-party public reels cannot be imported via Instagram’s official API.',
      400,
      'IMPORT_SOURCE_UNSUPPORTED',
    );
  }

  const provider = getContentImportProvider('instagram');
  let lastPlatformError: AppError | null = null;

  for (const account of accounts) {
    let accessToken: string;
    try {
      accessToken = await metaTokenService.getDecryptedAccessToken(
        userId,
        account._id.toString(),
      );
    } catch (error) {
      if (error instanceof AppError && error.code === 'META_TOKEN_EXPIRED') {
        throw new AppError(
          'This account token has expired. Please reconnect.',
          401,
          'IMPORT_TOKEN_EXPIRED',
          error.details,
        );
      }
      throw error;
    }

    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES_PER_ACCOUNT; page += 1) {
      let listed;
      try {
        listed = await provider.listMedia({
          userId,
          socialAccountId: account._id.toString(),
          platformAccountId: account.platformAccountId,
          accessToken,
          limit: PAGE_SIZE,
          cursor,
        });
      } catch (error) {
        if (error instanceof AppError) {
          lastPlatformError = error;
          if (
            error.code === 'IMPORT_TOKEN_EXPIRED' ||
            error.code === 'IMPORT_PERMISSION_REQUIRED'
          ) {
            break;
          }
          if (error.code === 'IMPORT_RATE_LIMITED') {
            throw error;
          }
        }
        logger.warn('Failed listing IG media while resolving permalink', {
          accountId: account._id.toString(),
          message: error instanceof Error ? error.message : String(error),
        });
        break;
      }

      const match = listed.items.find((item) =>
        permalinkContainsShortcode(item.permalink, parsed.shortcode),
      );

      if (match) {
        const existing = await MediaAsset.findOne({
          userId,
          sourcePlatform: 'instagram',
          sourceExternalId: match.externalId,
          status: 'ready',
        }).select('_id');

        return {
          parsed,
          account: {
            id: account._id.toString(),
            platformAccountId: account.platformAccountId,
            username: account.username,
            displayName: account.displayName,
          },
          item: {
            ...match,
            alreadyImported: Boolean(existing),
            existingMediaId: existing?._id.toString(),
          },
          alreadyImported: Boolean(existing),
          existingMediaId: existing?._id.toString(),
        };
      }

      if (!listed.nextCursor) break;
      cursor = listed.nextCursor;
    }
  }

  if (lastPlatformError?.code === 'IMPORT_PERMISSION_REQUIRED') {
    throw lastPlatformError;
  }
  if (lastPlatformError?.code === 'IMPORT_TOKEN_EXPIRED') {
    throw lastPlatformError;
  }

  throw new AppError(
    `Reel/post “${parsed.shortcode}” was not found on your connected Instagram account(s). Only media you own can be imported from a link — Instagram’s official API does not allow downloading other people’s public reels.`,
    404,
    'IMPORT_MEDIA_NOT_FOUND',
    { shortcode: parsed.shortcode },
  );
}
