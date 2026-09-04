import type { Request, Response, NextFunction } from 'express';
import {
  getCurrentUser,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
} from '../services/auth.service.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies.js';
import { AUTH_COOKIES } from '../constants/auth.js';
import type { LoginInput, RegisterInput } from '../validators/auth.validator.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await registerUser(req.body as RegisterInput);
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    res.status(201).json({
      success: true,
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await loginUser(req.body as LoginInput);
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    res.status(200).json({
      success: true,
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.[AUTH_COOKIES.refresh] as string | undefined;
    if (!refreshToken) {
      clearAuthCookies(res);
      res.status(401).json({
        success: false,
        message: 'Refresh token missing',
        code: 'REFRESH_MISSING',
        details: {},
        requestId: req.requestId,
      });
      return;
    }

    const tokens = await refreshSession(refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.status(200).json({
      success: true,
      data: { refreshed: true },
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.[AUTH_COOKIES.refresh] as string | undefined;
    await logoutSession(refreshToken);
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      data: { loggedOut: true },
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
        details: {},
        requestId: req.requestId,
      });
      return;
    }

    const user = await getCurrentUser(req.user.id);
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}
