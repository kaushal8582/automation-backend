import type { Request, Response, NextFunction } from 'express';
import {
  cancelPost,
  createPost,
  createPostsBatch,
  getPostById,
  listPosts,
  retryPost,
} from '../services/post.service.js';
import { getPostMetrics, syncPostMetrics } from '../services/metrics.service.js';
import type {
  CreatePostInput,
  CreatePostsBatchInput,
  ListPostsQuery,
  RetryPostInput,
} from '../validators/post.validator.js';

export async function createPostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await createPost(req.user!.id, req.body as CreatePostInput);
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createPostsBatchHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await createPostsBatch(req.user!.id, req.body as CreatePostsBatchInput);
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listPostsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListPostsQuery;
    const result = await listPosts(req.user!.id, {
      limit: query.limit,
      offset: query.offset,
      from: query.from,
      to: query.to,
      status: query.status,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getPostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await getPostById(req.user!.id, id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function cancelPostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await cancelPost(req.user!.id, id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getPostMetricsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const metrics = await getPostMetrics(req.user!.id, id);
    res.status(200).json({ success: true, data: { metrics } });
  } catch (error) {
    next(error);
  }
}

export async function refreshPostMetricsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    // Trigger a live sync then return fresh metrics
    await syncPostMetrics(id, req.user!.id);
    const metrics = await getPostMetrics(req.user!.id, id);
    res.status(200).json({ success: true, data: { metrics } });
  } catch (error) {
    next(error);
  }
}

export async function retryPostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = (req.body ?? {}) as RetryPostInput;
    const result = await retryPost(req.user!.id, id, body.destinationIds);
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
