import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';
import { AUTH_COOKIES } from '../constants/auth.js';
import { getRefreshTokenTtlSeconds } from './jwt.js';

function baseCookieOptions(): CookieOptions {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const base = baseCookieOptions();

  res.cookie(AUTH_COOKIES.access, accessToken, {
    ...base,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie(AUTH_COOKIES.refresh, refreshToken, {
    ...base,
    maxAge: getRefreshTokenTtlSeconds() * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  const base = baseCookieOptions();
  res.clearCookie(AUTH_COOKIES.access, base);
  res.clearCookie(AUTH_COOKIES.refresh, base);
}
