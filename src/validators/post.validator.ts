import { z } from 'zod';
import { POST_STATUSES } from '../types/domain.js';

const publishOptionsSchema = z
  .object({
    shareToFeed: z.boolean().optional(),
    hideLikeCount: z.boolean().optional(),
  })
  .optional();

export const createPostSchema = z.object({
  mediaId: z.string().min(1),
  socialAccountIds: z.array(z.string().min(1)).min(1).max(20),
  caption: z.string().max(2200).optional(),
  instagramCaption: z.string().max(2200).optional(),
  thumbnailMediaId: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  timezone: z.string().min(1).max(64).optional(),
  options: publishOptionsSchema,
});

export const createPostsBatchSchema = z.object({
  mediaIds: z.array(z.string().min(1)).min(1).max(20),
  socialAccountIds: z.array(z.string().min(1)).min(1).max(20),
  caption: z.string().max(2200).optional(),
  instagramCaption: z.string().max(2200).optional(),
  thumbnailMediaId: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  timezone: z.string().min(1).max(64).optional(),
  options: publishOptionsSchema,
});

export const listPostsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    status: z.enum(POST_STATUSES).optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.from && !data.to) || (!data.from && data.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from and to must both be provided',
        path: ['from'],
      });
    }
    if (data.from && data.to && new Date(data.from).getTime() >= new Date(data.to).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from must be before to',
        path: ['from'],
      });
    }
  });

export const retryPostSchema = z.object({
  destinationIds: z.array(z.string().min(1)).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreatePostsBatchInput = z.infer<typeof createPostsBatchSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
export type RetryPostInput = z.infer<typeof retryPostSchema>;
