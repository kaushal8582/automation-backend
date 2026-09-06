import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.js';
export function getFacebookAppCredentials() {
    // Facebook Login needs the Meta/Facebook App ID — never the Instagram App ID.
    const appId = env.FACEBOOK_APP_ID ?? env.META_APP_ID;
    const appSecret = env.FACEBOOK_APP_SECRET ?? env.META_APP_SECRET;
    if (!appId || !appSecret) {
        throw new AppError('Facebook OAuth is not configured. Set META_APP_ID and META_APP_SECRET (or FACEBOOK_APP_ID / FACEBOOK_APP_SECRET). Do not use INSTAGRAM_APP_ID for Facebook Login.', 503, 'FACEBOOK_OAUTH_NOT_CONFIGURED');
    }
    return { appId, appSecret };
}
export function getFacebookOAuthRedirectUri() {
    if (env.FACEBOOK_REDIRECT_URI)
        return env.FACEBOOK_REDIRECT_URI;
    return `${env.FRONTEND_URL.replace(/\/$/, '')}/accounts/facebook/callback`;
}
/** Facebook Login for Business configuration ID (App Dashboard → Configurations). */
export function getFacebookConfigId() {
    return env.FACEBOOK_CONFIG_ID;
}
export function getFacebookOAuthScopes() {
    return env.FACEBOOK_OAUTH_SCOPES.split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
//# sourceMappingURL=facebook-oauth.js.map