import type { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIES } from '../constants/auth.js';
import { AppError } from './error-handler.js';
import { verifyAccessToken } from '../utils/jwt.js';

export type AuthenticatedUser = {
  id: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIES.access] as string | undefined;

  if (!token) {
    next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN'));
  }
}
