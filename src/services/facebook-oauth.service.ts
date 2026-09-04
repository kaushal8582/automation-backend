import axios from 'axios';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import {
  getFacebookAppCredentials,
  getFacebookOAuthRedirectUri,
  getFacebookOAuthScopes,
} from '../config/facebook-oauth.js';
import { AppError } from '../middlewares/error-handler.js';
import { SocialAccount } from '../models/social-account.model.js';
import { createFacebookGraphClient } from '../providers/meta/meta-client.js';
import { normalizeMetaError } from '../providers/meta/meta-errors.js';
import { createLogger } from '../utils/logger.js';
import { maskToken } from '../utils/encryption.js';
import { metaTokenService } from './meta-token.service.js';
import { createFacebookOAuthState, consumeFacebookOAuthState } from './oauth-state.service.js';
import type { PublicSocialAccount } from './social-account.service.js';

const logger = createLogger('facebook-oauth');

/* ─── Types ─────────────────────────────────────────────────────────────── */

type FBTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
};

type FBUserPage = {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: { data?: { url?: string } };
};

type FBPagesResponse = {
  data: FBUserPage[];
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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

/* ─── Build connect URL ──────────────────────────────────────────────────── */

export async function buildFacebookConnectUrl(
  userId: string,
): Promise<{ authorizationUrl: string; redirectUri: string; state: string }> {
  const { appId } = getFacebookAppCredentials();
  const redirectUri = getFacebookOAuthRedirectUri();
  const scopes = getFacebookOAuthScopes();
  const state = await createFacebookOAuthState({ userId });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(','),
    state,
  });

  const authorizationUrl = `https://www.facebook.com/dialog/oauth?${params.toString()}`;
  return { authorizationUrl, redirectUri, state };
}

/* ─── Exchange code for short-lived user token ───────────────────────────── */

async function exchangeCodeForToken(code: string): Promise<FBTokenResponse> {
  const { appId, appSecret } = getFacebookAppCredentials();
  const redirectUri = getFacebookOAuthRedirectUri();

  try {
    const { data } = await axios.get<FBTokenResponse>(
      'https://graph.facebook.com/oauth/access_token',
      {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        },
        timeout: 30_000,
      },
    );

    if (!data.access_token) {
      throw new AppError('Facebook token exchange returned no access_token', 502, 'META_API_ERROR');
    }

    return data;
  } catch (error) {
    throw normalizeMetaError(error);
  }
}

/* ─── Exchange short-lived for long-lived user token ─────────────────────── */

async function exchangeForLongLivedToken(shortToken: string): Promise<FBTokenResponse> {
  const { appId, appSecret } = getFacebookAppCredentials();

  try {
    const { data } = await axios.get<FBTokenResponse>(
      'https://graph.facebook.com/oauth/access_token',
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortToken,
        },
        timeout: 30_000,
      },
    );

    if (!data.access_token) {
      throw new AppError('Facebook long-lived token exchange failed', 502, 'META_API_ERROR');
    }

    return data;
  } catch (error) {
    throw normalizeMetaError(error);
  }
}

/* ─── Fetch managed pages ────────────────────────────────────────────────── */

async function fetchManagedPages(longLivedUserToken: string): Promise<FBUserPage[]> {
  const client = createFacebookGraphClient();

  try {
    const { data } = await client.get<FBPagesResponse>('/me/accounts', {
      params: {
        fields: 'id,name,access_token,category,picture{url}',
        access_token: longLivedUserToken,
      },
    });

    return data.data ?? [];
  } catch (error) {
    throw normalizeMetaError(error);
  }
}

/* ─── OAuth callback handler ─────────────────────────────────────────────── */

export async function handleFacebookOAuthCallback(input: {
  code?: string;
  state?: string;
  error?: string;
  errorReason?: string;
  errorDescription?: string;
}): Promise<{ redirectUrl: string }> {
  const frontend = env.FRONTEND_URL.replace(/\/$/, '');

  if (input.error) {
    const message = encodeURIComponent(
      input.errorDescription ?? input.errorReason ?? input.error,
    );
    return { redirectUrl: `${frontend}/accounts?error=${message}` };
  }

  if (!input.code || !input.state) {
    return {
      redirectUrl: `${frontend}/accounts?error=${encodeURIComponent('Missing OAuth code or state')}`,
    };
  }

  const statePayload = await consumeFacebookOAuthState(input.state);
  if (!statePayload) {
    return {
      redirectUrl: `${frontend}/accounts?error=${encodeURIComponent('Invalid or expired OAuth state')}`,
    };
  }

  const shortLived = await exchangeCodeForToken(input.code);
  logger.info('Exchanged FB auth code for short-lived token', {
    userId: statePayload.userId,
    token: maskToken(shortLived.access_token),
  });

  const longLived = await exchangeForLongLivedToken(shortLived.access_token);
  logger.info('Exchanged for FB long-lived token', {
    expiresIn: longLived.expires_in,
  });

  const pages = await fetchManagedPages(longLived.access_token);
  if (pages.length === 0) {
    return {
      redirectUrl: `${frontend}/accounts?error=${encodeURIComponent('No Facebook Pages found. Make sure you manage at least one Page.')}`,
    };
  }

  logger.info(`Found ${pages.length} Facebook Pages, upserting…`, {
    userId: statePayload.userId,
  });

  // Upsert all pages as individual SocialAccount records
  const savedAccounts = await Promise.all(
    pages.map(async (page) => {
      const encrypted = metaTokenService.encryptAccessToken(page.access_token);
      const tokenExpiresAt = longLived.expires_in
        ? new Date(Date.now() + longLived.expires_in * 1000)
        : undefined;

      const account = await SocialAccount.findOneAndUpdate(
        {
          userId: statePayload.userId,
          platform: 'facebook',
          platformAccountId: page.id,
        },
        {
          $set: {
            platform: 'facebook',
            accountType: 'facebook_page',
            platformAccountId: page.id,
            username: page.name,
            displayName: page.name,
            profilePicture: page.picture?.data?.url,
            accessTokenEncrypted: encrypted,
            tokenExpiresAt,
            permissions: getFacebookOAuthScopes(),
            status: 'active',
            metadata: {
              connectionMethod: 'oauth',
              category: page.category,
            },
          },
          $setOnInsert: {
            userId: new Types.ObjectId(statePayload.userId),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return account;
    }),
  );

  const pageNames = savedAccounts.map((a) => a?.username ?? '?').join(', ');

  return {
    redirectUrl: `${frontend}/accounts?connected=facebook&pages=${encodeURIComponent(pageNames)}`,
  };
}

/* ─── List connected Facebook pages ─────────────────────────────────────── */

export async function listFacebookAccounts(userId: string): Promise<PublicSocialAccount[]> {
  const accounts = await SocialAccount.find({ userId, platform: 'facebook' }).sort({
    createdAt: -1,
  });
  return accounts.map(toPublicAccount);
}
