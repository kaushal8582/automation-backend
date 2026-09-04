import { Types } from 'mongoose';
import { SocialAccount, type ISocialAccountDocument } from '../models/social-account.model.js';
import { MediaAsset } from '../models/media-asset.model.js';
import { AppError } from '../middlewares/error-handler.js';
import { resolveAccessibleMediaUrl } from '../config/r2.js';
import { env } from '../config/env.js';
import { createInstagramGraphClient } from '../providers/meta/meta-client.js';
import { normalizeMetaError } from '../providers/meta/meta-errors.js';
import { InstagramPublisher } from '../providers/instagram/instagram-publisher.js';
import { metaTokenService } from './meta-token.service.js';
import type {
  InstagramTestPublishInput,
  ManualSocialAccountInput,
} from '../validators/social.validator.js';

export type PublicSocialAccount = {
  id: string;
  platform: ISocialAccountDocument['platform'];
  accountType: ISocialAccountDocument['accountType'];
  platformAccountId: string;
  username?: string;
  displayName?: string;
  profilePicture?: string;
  permissions: string[];
  status: ISocialAccountDocument['status'];
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toPublic(account: ISocialAccountDocument): PublicSocialAccount {
  return {
    id: account._id.toString(),
    platform: account.platform,
    accountType: account.accountType,
    platformAccountId: account.platformAccountId,
    username: account.username,
    displayName: account.displayName,
    profilePicture: account.profilePicture,
    permissions: account.permissions,
    status: account.status,
    tokenExpiresAt: account.tokenExpiresAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function listSocialAccounts(userId: string): Promise<PublicSocialAccount[]> {
  const accounts = await SocialAccount.find({ userId }).sort({ createdAt: -1 });
  return accounts.map(toPublic);
}

export async function connectManualSocialAccount(
  userId: string,
  input: ManualSocialAccountInput,
): Promise<PublicSocialAccount> {
  if (input.platform === 'instagram') {
    if (
      input.accountType !== 'instagram_business' &&
      input.accountType !== 'instagram_creator'
    ) {
      throw new AppError('Invalid Instagram account type', 400, 'INVALID_ACCOUNT_TYPE');
    }
  }

  if (input.platform === 'facebook' && input.accountType !== 'facebook_page') {
    throw new AppError('Facebook accounts must be facebook_page', 400, 'INVALID_ACCOUNT_TYPE');
  }

  // Optional live profile check for Instagram manual tokens
  let username = input.username;
  let platformAccountId = input.platformAccountId;

  if (input.platform === 'instagram') {
    try {
      const client = createInstagramGraphClient();
      const { data } = await client.get<{ id: string; username?: string }>('/me', {
        params: {
          fields: 'id,username',
          access_token: input.accessToken,
        },
      });
      platformAccountId = data.id || platformAccountId;
      username = data.username ?? username;
    } catch (error) {
      throw normalizeMetaError(error);
    }
  }

  const encrypted = metaTokenService.encryptAccessToken(input.accessToken);

  const account = await SocialAccount.findOneAndUpdate(
    {
      userId,
      platform: input.platform,
      platformAccountId,
    },
    {
      $set: {
        accountType: input.accountType,
        username,
        displayName: input.displayName ?? username,
        profilePicture: input.profilePicture,
        accessTokenEncrypted: encrypted,
        tokenExpiresAt: input.tokenExpiresAt,
        permissions: input.permissions ?? [],
        status: 'active',
        metadata: { connectionMethod: 'manual' },
      },
      $setOnInsert: {
        userId: new Types.ObjectId(userId),
        platform: input.platform,
        platformAccountId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!account) {
    throw new AppError('Failed to save social account', 500, 'SOCIAL_ACCOUNT_SAVE_FAILED');
  }

  return toPublic(account);
}

export async function deleteSocialAccount(userId: string, accountId: string): Promise<void> {
  if (!Types.ObjectId.isValid(accountId)) {
    throw new AppError('Invalid social account id', 400, 'INVALID_SOCIAL_ACCOUNT_ID');
  }
  const deleted = await SocialAccount.findOneAndDelete({ _id: accountId, userId });
  if (!deleted) {
    throw new AppError('Social account not found', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
  }
}

export async function testPublishInstagramReel(
  userId: string,
  input: InstagramTestPublishInput,
): Promise<{
  platformContainerId: string;
  platformPostId: string;
  videoUrl: string;
  usedTemporaryUrl: boolean;
}> {
  if (!Types.ObjectId.isValid(input.mediaId)) {
    throw new AppError('Invalid media id', 400, 'INVALID_MEDIA_ID');
  }

  const account = await SocialAccount.findOne({
    _id: input.socialAccountId,
    userId,
    platform: 'instagram',
  });
  if (!account) {
    throw new AppError('Instagram account not found', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
  }

  const media = await MediaAsset.findOne({ _id: input.mediaId, userId, type: 'video' });
  if (!media || media.status !== 'ready') {
    throw new AppError('Ready video media not found', 404, 'MEDIA_NOT_FOUND');
  }

  const accessToken = await metaTokenService.getDecryptedAccessToken(userId, account.id);
  const usedTemporaryUrl = !env.R2_PUBLIC_URL;
  const videoUrl = await resolveAccessibleMediaUrl(media.r2Key, media.publicUrl);

  if (!videoUrl.startsWith('http')) {
    throw new AppError(
      'Video public URL is unavailable. Set R2_PUBLIC_URL for Meta publishing.',
      400,
      'MEDIA_PUBLIC_URL_REQUIRED',
    );
  }

  const publisher = new InstagramPublisher();
  try {
    const result = await publisher.publishReel({
      platformAccountId: account.platformAccountId,
      accessToken,
      videoUrl,
      caption: input.caption ?? '',
    });

    return {
      ...result,
      videoUrl,
      usedTemporaryUrl,
    };
  } catch (error) {
    if (error instanceof AppError && error.code === 'META_TOKEN_EXPIRED') {
      await metaTokenService.markReconnectRequired(userId, account.id, 'expired');
    }
    throw error;
  }
}
