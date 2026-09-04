import type { Request, Response, NextFunction } from 'express';
import {
  bulkDeleteMediaForUser,
  completeMediaUpload,
  createPresignedUpload,
  createPresignedUploadBatch,
  deleteMediaForUser,
  getMediaUploadLimits,
  listMediaForUser,
} from '../services/media.service.js';
import type {
  BulkDeleteMediaInput,
  CompleteMediaInput,
  PresignMediaBatchInput,
  PresignMediaInput,
} from '../validators/media.validator.js';

export async function presignMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await createPresignedUpload(req.user!.id, req.body as PresignMediaInput);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function presignMediaBatch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await createPresignedUploadBatch(
      req.user!.id,
      req.body as PresignMediaBatchInput,
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function completeMedia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const media = await completeMediaUpload(req.user!.id, req.body as CompleteMediaInput);
    res.status(201).json({ success: true, data: { media } });
  } catch (error) {
    next(error);
  }
}

export async function listMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const media = await listMediaForUser(req.user!.id);
    res.status(200).json({
      success: true,
      data: {
        media,
        limits: getMediaUploadLimits(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteMediaForUser(req.user!.id, id);
    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
}

export async function bulkDeleteMedia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as BulkDeleteMediaInput;
    const result = await bulkDeleteMediaForUser(req.user!.id, body.ids);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
