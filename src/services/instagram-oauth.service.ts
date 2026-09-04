import axios from 'axios';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import {
  getInstagramAppCredentials,
  getInstagramOAuthRedirectUri,
  getInstagramOAuthScopes,
} from '../config/instagram-oauth.js';
import { AppError } from '../middlewares/error-handler.js';
import { SocialAccount } from '../models/social-account.model.js';
import { createInstagramGraphClient } from '../providers/meta/meta-client.js';
import { normalizeMetaError } from '../providers/meta/meta-errors.js';
import { createLogger } from '../utils/logger.js';
import { maskToken } from '../utils/encryption.js';
import { metaTokenService } from './meta-token.service.js';
import { createOAuthState, consumeOAuthState } from './oauth-state.service.js';
import type { PublicSocialAccount } from './social-account.service.js';

const logger = createLogger('instagram-oauth');

type ShortLivedTokenResponse = {
  access_token: string;
  user_id: number | string;
  permissions?: string[];
};

type LongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type InstagramMeResponse = {
  id: string;
  user_id?: string;
  username?: string;
  account_type?: string;
  profile_picture_url?: string;
};

function toPublicAccount(account: {
  _id: Types.ObjectId;
  platform: PublicSocialAccount['platform'];
  accountType: PublicSocialAccount['accountType'];
  platformAccountId: string;
  username?: string;
  displayName?: string;
  profilePicture?: string;
  permissions: string[];
  status: PublicSocialAccount['status'];
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}): PublicSocialAccount {
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

export async function buildInstagramConnectUrl(
  userId: string,
  reconnectAccountId?: string,
): Promise<{ authorizationUrl: string; redirectUri: string; state: string }> {
  const { appId } = getInstagramAppCredentials();
  const redirectUri = getInstagramOAuthRedirectUri();
  const scopes = getInstagramOAuthScopes();
  const state = await createOAuthState({ userId, reconnectAccountId });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(','),
    state,
  });

  // Business Login for Instagram authorization window
  const authorizationUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;

  return { authorizationUrl, redirectUri, state };
}

async function exchangeCodeForShortLivedToken(code: string): Promise<ShortLivedTokenResponse> {
  const { appId, appSecret } = getInstagramAppCredentials();
  const redirectUri = getInstagramOAuthRedirectUri();

  // Strip trailing #_ that Instagram sometimes appends
  const cleanCode = code.replace(/#_+$/, '');

  try {
    const { data } = await axios.post<ShortLivedTokenResponse>(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: cleanCode,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30_000,
      },
    );

    if (!data.access_token) {
      throw new AppError('Instagram token exchange failed', 502, 'META_API_ERROR');
    }

    return data;
  } catch (error) {
    throw normalizeMetaError(error);
  }
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const { appSecret } = getInstagramAppCredentials();

  try {
    const { data } = await axios.get<LongLivedTokenResponse>('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: appSecret,
        access_token: shortLivedToken,
      },
      timeout: 30_000,
    });

    if (!data.access_token) {
      throw new AppError('Instagram long-lived token exchange failed', 502, 'META_API_ERROR');
    }

    return data;
  } catch (error) {
    throw normalizeMetaError(error);
  }
}

async function fetchInstagramProfile(accessToken: string): Promise<InstagramMeResponse> {
  try {
    const client = createInstagramGraphClient();
    const { data } = await client.get<InstagramMeResponse>('/me', {
      params: {
        fields: 'id,user_id,username,account_type,profile_picture_url',
        access_token: accessToken,
      },
    });
    return data;
  } catch (error) {
    throw normalizeMetaError(error);
  }
}

function mapAccountType(
  accountType?: string,
): 'instagram_business' | 'instagram_creator' {
  if (accountType?.toUpperCase() === 'MEDIA_CREATOR' || accountType?.toLowerCase() === 'creator') {
    return 'instagram_creator';
  }
  return 'instagram_business';
}

export async function handleInstagramOAuthCallback(input: {
  code?: string;
  state?: string;
  error?: string;
  errorReason?: string;
  errorDescription?: string;
}): Promise<{ redirectUrl: string }> {
  const frontend = env.FRONTEND_URL.replace(/\/$/, '');

  if (input.error) {
    const message = encodeURIComponent(input.errorDescription || input.errorReason || input.error);
    return { redirectUrl: `${frontend}/accounts?error=${message}` };
  }

  if (!input.code || !input.state) {
    return {
      redirectUrl: `${frontend}/accounts?error=${encodeURIComponent('Missing OAuth code or state')}`,
    };
  }

  const statePayload = await consumeOAuthState(input.state);
  if (!statePayload) {
    return {
      redirectUrl: `${frontend}/accounts?error=${encodeURIComponent('Invalid or expired OAuth state')}`,
    };
  }

  const shortLived = await exchangeCodeForShortLivedToken(input.code);
  logger.info('Exchanged IG auth code for short-lived token', {
    userId: statePayload.userId,
    token: maskToken(shortLived.access_token),
  });

  const longLived = await exchangeForLongLivedToken(shortLived.access_token);
  const profile = await fetchInstagramProfile(longLived.access_token);

  const platformAccountId = String(profile.user_id || profile.id || shortLived.user_id);
  const encrypted = metaTokenService.encryptAccessToken(longLived.access_token);
  const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000);
  const permissions =
    shortLived.permissions ??
    getInstagramOAuthScopes();

  const filter = statePayload.reconnectAccountId
    ? { _id: statePayload.reconnectAccountId, userId: statePayload.userId, platform: 'instagram' as const }
    : {
        userId: statePayload.userId,
        platform: 'instagram' as const,
        platformAccountId,
      };

  const account = await SocialAccount.findOneAndUpdate(
    filter,
    {
      $set: {
        platform: 'instagram',
        accountType: mapAccountType(profile.account_type),
        platformAccountId,
        username: profile.username,
        displayName: profile.username,
        profilePicture: profile.profile_picture_url,
        accessTokenEncrypted: encrypted,
        tokenExpiresAt,
        permissions,
        status: 'active',
        metadata: {
          connectionMethod: 'oauth',
          igAppScopedId: profile.id,
        },
      },
      $setOnInsert: {
        userId: new Types.ObjectId(statePayload.userId),
      },
    },
    { upsert: !statePayload.reconnectAccountId, new: true, setDefaultsOnInsert: true },
  );

  if (!account) {
    throw new AppError('Failed to save Instagram account after OAuth', 500, 'SOCIAL_ACCOUNT_SAVE_FAILED');
  }

  // Touch for type usage / future logging without exposing token
  void toPublicAccount(account);

  return {
    redirectUrl: `${frontend}/accounts?connected=instagram&username=${encodeURIComponent(profile.username ?? platformAccountId)}`,
  };
}

export async function listInstagramAccounts(userId: string): Promise<PublicSocialAccount[]> {
  const accounts = await SocialAccount.find({ userId, platform: 'instagram' }).sort({ createdAt: -1 });
  return accounts.map(toPublicAccount);
}
