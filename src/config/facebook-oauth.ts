import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.js';

export function getFacebookAppCredentials(): { appId: string; appSecret: string } {
  // Facebook pages use the same Meta app — fall back to META_APP_ID/META_APP_SECRET
  const appId = env.FACEBOOK_APP_ID ?? env.META_APP_ID ?? env.INSTAGRAM_APP_ID;
  const appSecret = env.FACEBOOK_APP_SECRET ?? env.META_APP_SECRET ?? env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    throw new AppError(
      'Facebook OAuth is not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET (or META_APP_ID/META_APP_SECRET).',
      503,
      'FACEBOOK_OAUTH_NOT_CONFIGURED',
    );
  }

  return { appId, appSecret };
}

export function getFacebookOAuthRedirectUri(): string {
  if (env.FACEBOOK_REDIRECT_URI) return env.FACEBOOK_REDIRECT_URI;
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/accounts/facebook/callback`;
}

export function getFacebookOAuthScopes(): string[] {
  return env.FACEBOOK_OAUTH_SCOPES.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
