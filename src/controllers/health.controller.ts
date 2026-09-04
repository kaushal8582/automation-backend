import type { Request, Response, NextFunction } from 'express';
import { getHealthStatus } from '../services/health.service.js';

export async function healthCheck(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const health = await getHealthStatus();
    const statusCode = health.success ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    next(error);
  }
}
