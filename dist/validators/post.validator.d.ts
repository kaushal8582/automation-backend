import { z } from 'zod';
export declare const createPostSchema: z.ZodObject<{
    mediaId: z.ZodString;
    socialAccountIds: z.ZodArray<z.ZodString, "many">;
    caption: z.ZodOptional<z.ZodString>;
    instagramCaption: z.ZodOptional<z.ZodString>;
    thumbnailMediaId: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodObject<{
        shareToFeed: z.ZodOptional<z.ZodBoolean>;
        hideLikeCount: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        shareToFeed?: boolean | undefined;
        hideLikeCount?: boolean | undefined;
    }, {
        shareToFeed?: boolean | undefined;
        hideLikeCount?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    mediaId: string;
    socialAccountIds: string[];
    options?: {
        shareToFeed?: boolean | undefined;
        hideLikeCount?: boolean | undefined;
    } | undefined;
    timezone?: string | undefined;
    caption?: string | undefined;
    thumbnailMediaId?: string | undefined;
    instagramCaption?: string | undefined;
    scheduledAt?: string | undefined;
}, {
    mediaId: string;
    socialAccountIds: string[];
    options?: {
        shareToFeed?: boolean | undefined;
        hideLikeCount?: boolean | undefined;
    } | undefined;
    timezone?: string | undefined;
    caption?: string | undefined;
    thumbnailMediaId?: string | undefined;
    instagramCaption?: string | undefined;
    scheduledAt?: string | undefined;
}>;
export declare const createPostsBatchSchema: z.ZodObject<{
    mediaIds: z.ZodArray<z.ZodString, "many">;
    socialAccountIds: z.ZodArray<z.ZodString, "many">;
    caption: z.ZodOptional<z.ZodString>;
    instagramCaption: z.ZodOptional<z.ZodString>;
    thumbnailMediaId: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodObject<{
        shareToFeed: z.ZodOptional<z.ZodBoolean>;
        hideLikeCount: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        shareToFeed?: boolean | undefined;
        hideLikeCount?: boolean | undefined;
    }, {
        shareToFeed?: boolean | undefined;
        hideLikeCount?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    socialAccountIds: string[];
    mediaIds: string[];
    options?: {
        shareToFeed?: boolean | undefined;
        hideLikeCount?: boolean | undefined;
    } | undefined;
    timezone?: string | undefined;
    caption?: string | undefined;
    thumbnailMediaId?: string | undefined;
    instagramCaption?: string | undefined;
    scheduledAt?: string | undefined;
}, {
    socialAccountIds: string[];
    mediaIds: string[];
    options?: {
        shareToFeed?: boolean | undefined;
        hideLikeCount?: boolean | undefined;
    } | undefined;
    timezone?: string | undefined;
    caption?: string | undefined;
    thumbnailMediaId?: string | undefined;
    instagramCaption?: string | undefined;
    scheduledAt?: string | undefined;
}>;
export declare const listPostsQuerySchema: z.ZodEffects<z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "queued", "scheduled", "processing", "partially_published", "published", "failed", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    status?: "failed" | "scheduled" | "draft" | "queued" | "processing" | "partially_published" | "published" | "cancelled" | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    status?: "failed" | "scheduled" | "draft" | "queued" | "processing" | "partially_published" | "published" | "cancelled" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>, {
    limit: number;
    offset: number;
    status?: "failed" | "scheduled" | "draft" | "queued" | "processing" | "partially_published" | "published" | "cancelled" | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    status?: "failed" | "scheduled" | "draft" | "queued" | "processing" | "partially_published" | "published" | "cancelled" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>;
export declare const retryPostSchema: z.ZodObject<{
    destinationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    destinationIds?: string[] | undefined;
}, {
    destinationIds?: string[] | undefined;
}>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreatePostsBatchInput = z.infer<typeof createPostsBatchSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
export type RetryPostInput = z.infer<typeof retryPostSchema>;
//# sourceMappingURL=post.validator.d.ts.map