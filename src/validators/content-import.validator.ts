import { z } from 'zod';
import {
  CONTENT_IMPORT_DEFAULT_PAGE_SIZE,
  CONTENT_IMPORT_MAX_BATCH,
  CONTENT_IMPORT_MAX_PAGE_SIZE,
  INSTAGRAM_PUBLIC_IMPORT_MAX_RESOURCES,
} from '../constants/content-import.js';

export const listAccountMediaQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(CONTENT_IMPORT_MAX_PAGE_SIZE)
    .optional()
    .default(CONTENT_IMPORT_DEFAULT_PAGE_SIZE),
  cursor: z.string().trim().min(1).optional(),
});

export const importAccountMediaSchema = z.object({
  externalIds: z.array(z.string().trim().min(1)).min(1).max(CONTENT_IMPORT_MAX_BATCH),
});

export const importUrlSchema = z.object({
  url: z.string().trim().url().max(2048),
  socialAccountId: z.string().trim().min(1).optional(),
});

export const instagramPublicPreviewSchema = z.object({
  url: z.string().trim().url().max(2048),
});

export const instagramPublicImportSchema = z.object({
  sourceUrl: z.string().trim().url().max(2048),
  resourceIds: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(INSTAGRAM_PUBLIC_IMPORT_MAX_RESOURCES),
  rightsConfirmed: z.literal(true, {
    errorMap: () => ({
      message: 'You must confirm you own this content or have permission to reuse it.',
    }),
  }),
  forceDuplicate: z.boolean().optional().default(false),
});

export const importJobsQuerySchema = z.object({
  ids: z.string().trim().min(1),
});

export type ListAccountMediaQuery = z.infer<typeof listAccountMediaQuerySchema>;
export type ImportAccountMediaInput = z.infer<typeof importAccountMediaSchema>;
export type ImportUrlInput = z.infer<typeof importUrlSchema>;
export type InstagramPublicPreviewInput = z.infer<typeof instagramPublicPreviewSchema>;
export type InstagramPublicImportInput = z.infer<typeof instagramPublicImportSchema>;
