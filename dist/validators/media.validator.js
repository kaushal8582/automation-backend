import { z } from 'zod';
import { ALLOWED_MEDIA_MIME_TYPES } from '../constants/media.js';
import { MEDIA_TYPES } from '../types/domain.js';
export const presignMediaSchema = z.object({
    originalFilename: z.string().trim().min(1).max(255),
    mimeType: z.enum(ALLOWED_MEDIA_MIME_TYPES),
    fileSize: z.number().int().positive(),
    type: z.enum(MEDIA_TYPES).optional(),
});
export const presignMediaBatchSchema = z.object({
    files: z.array(presignMediaSchema).min(1).max(20),
});
export const completeMediaSchema = z.object({
    r2Key: z.string().trim().min(1),
    originalFilename: z.string().trim().min(1).max(255),
    mimeType: z.enum(ALLOWED_MEDIA_MIME_TYPES),
    fileSize: z.number().int().positive(),
    type: z.enum(MEDIA_TYPES).optional(),
    duration: z.number().nonnegative().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
});
export const bulkDeleteMediaSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(50),
});
//# sourceMappingURL=media.validator.js.map