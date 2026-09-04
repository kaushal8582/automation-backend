import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../middlewares/error-handler.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          issues: parsed.error.flatten(),
        }),
      );
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(
        new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          issues: parsed.error.flatten(),
        }),
      );
      return;
    }
    req.query = parsed.data as Request['query'];
    next();
  };
}
