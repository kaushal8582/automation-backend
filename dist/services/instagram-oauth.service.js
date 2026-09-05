import axios from 'axios';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { getInstagramAppCredentials, getInstagramOAuthRedirectUri, getInstagramOAuthScopes, } from '../config/instagram-oauth.js';
import { AppError } from '../middlewares/error-handler.js';
import { SocialAccount } from '../models/social-account.model.js';
import { createInstagramGraphClient } from '../providers/meta/meta-client.js';
import { normalizeMetaError } from '../providers/meta/meta-errors.js';
import { createLogger } from '../utils/logger.js';
import { maskToken } from '../utils/encryption.js';
import { metaTokenService } from './meta-token.service.js';
import { createOAuthState, consumeOAuthState } from './oauth-state.service.js';
const logger = createLogger('instagram-oauth');
function toPublicAccount(account) {
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
export async function buildInstagramConnectUrl(userId, reconnectAccountId) {
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
async function exchangeCodeForShortLivedToken(code) {
    const { appId, appSecret } = getInstagramAppCredentials();
    const redirectUri = getInstagramOAuthRedirectUri();
    // Strip trailing #_ that Instagram sometimes appends
    const cleanCode = code.replace(/#_+$/, '');
    try {
        const { data } = await axios.post('https://api.instagram.com/oauth/access_token', new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: cleanCode,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 30_000,
        });
        if (!data.access_token) {
            throw new AppError('Instagram token exchange failed', 502, 'META_API_ERROR');
        }
        return data;
    }
    catch (error) {
        throw normalizeMetaError(error);
    }
}
async function exchangeForLongLivedToken(shortLivedToken) {
    const { appSecret } = getInstagramAppCredentials();
    try {
        const { data } = await axios.get('https://graph.instagram.com/access_token', {
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
    }
    catch (error) {
        throw normalizeMetaError(error);
    }
}
async function fetchInstagramProfile(accessToken) {
    try {
        const client = createInstagramGraphClient();
        const { data } = await client.get('/me', {
            params: {
                fields: 'id,user_id,username,account_type,profile_picture_url',
                access_token: accessToken,
            },
        });
        return data;
    }
    catch (error) {
        throw normalizeMetaError(error);
    }
}
function mapAccountType(accountType) {
    if (accountType?.toUpperCase() === 'MEDIA_CREATOR' || accountType?.toLowerCase() === 'creator') {
        return 'instagram_creator';
    }
    return 'instagram_business';
}
export async function handleInstagramOAuthCallback(input) {
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
    const permissions = shortLived.permissions ??
        getInstagramOAuthScopes();
    const filter = statePayload.reconnectAccountId
        ? { _id: statePayload.reconnectAccountId, userId: statePayload.userId, platform: 'instagram' }
        : {
            userId: statePayload.userId,
            platform: 'instagram',
            platformAccountId,
        };
    const account = await SocialAccount.findOneAndUpdate(filter, {
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
    }, { upsert: !statePayload.reconnectAccountId, new: true, setDefaultsOnInsert: true });
    if (!account) {
        throw new AppError('Failed to save Instagram account after OAuth', 500, 'SOCIAL_ACCOUNT_SAVE_FAILED');
    }
    // Touch for type usage / future logging without exposing token
    void toPublicAccount(account);
    return {
        redirectUrl: `${frontend}/accounts?connected=instagram&username=${encodeURIComponent(profile.username ?? platformAccountId)}`,
    };
}
export async function listInstagramAccounts(userId) {
    const accounts = await SocialAccount.find({ userId, platform: 'instagram' }).sort({ createdAt: -1 });
    return accounts.map(toPublicAccount);
}
//# sourceMappingURL=instagram-oauth.service.js.map