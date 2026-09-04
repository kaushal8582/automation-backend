import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.js';

export function getInstagramAppCredentials(): { appId: string; appSecret: string } {
  const appId = env.INSTAGRAM_APP_ID ?? env.META_APP_ID;
  const appSecret = env.INSTAGRAM_APP_SECRET ?? env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new AppError(
      'Instagram OAuth is not configured. Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET.',
      503,
      'INSTAGRAM_OAUTH_NOT_CONFIGURED',
    );
  }

  return { appId, appSecret };
}

export function getInstagramOAuthRedirectUri(): string {
  // Must match Meta App Dashboard exactly (including trailing slash if present there).
  if (env.INSTAGRAM_REDIRECT_URI) {
    return env.INSTAGRAM_REDIRECT_URI;
  }
  // Prefer frontend HTTP callback for local DX (Meta often rejects http://localhost on API ports
  // when registered as https://, which then causes ERR_SSL_PROTOCOL_ERROR).
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/accounts/instagram/callback`;
}

export function getInstagramOAuthScopes(): string[] {
  return env.INSTAGRAM_OAUTH_SCOPES.split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}
