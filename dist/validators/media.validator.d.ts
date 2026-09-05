import { z } from 'zod';
export declare const presignMediaSchema: z.ZodObject<{
    originalFilename: z.ZodString;
    mimeType: z.ZodEnum<[string, ...string[]]>;
    fileSize: z.ZodNumber;
    type: z.ZodOptional<z.ZodEnum<["video", "image", "thumbnail"]>>;
}, "strip", z.ZodTypeAny, {
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    type?: "video" | "image" | "thumbnail" | undefined;
}, {
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    type?: "video" | "image" | "thumbnail" | undefined;
}>;
export declare const presignMediaBatchSchema: z.ZodObject<{
    files: z.ZodArray<z.ZodObject<{
        originalFilename: z.ZodString;
        mimeType: z.ZodEnum<[string, ...string[]]>;
        fileSize: z.ZodNumber;
        type: z.ZodOptional<z.ZodEnum<["video", "image", "thumbnail"]>>;
    }, "strip", z.ZodTypeAny, {
        originalFilename: string;
        mimeType: string;
        fileSize: number;
        type?: "video" | "image" | "thumbnail" | undefined;
    }, {
        originalFilename: string;
        mimeType: string;
        fileSize: number;
        type?: "video" | "image" | "thumbnail" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    files: {
        originalFilename: string;
        mimeType: string;
        fileSize: number;
        type?: "video" | "image" | "thumbnail" | undefined;
    }[];
}, {
    files: {
        originalFilename: string;
        mimeType: string;
        fileSize: number;
        type?: "video" | "image" | "thumbnail" | undefined;
    }[];
}>;
export declare const completeMediaSchema: z.ZodObject<{
    r2Key: z.ZodString;
    originalFilename: z.ZodString;
    mimeType: z.ZodEnum<[string, ...string[]]>;
    fileSize: z.ZodNumber;
    type: z.ZodOptional<z.ZodEnum<["video", "image", "thumbnail"]>>;
    duration: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    originalFilename: string;
    r2Key: string;
    mimeType: string;
    fileSize: number;
    type?: "video" | "image" | "thumbnail" | undefined;
    duration?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
}, {
    originalFilename: string;
    r2Key: string;
    mimeType: string;
    fileSize: number;
    type?: "video" | "image" | "thumbnail" | undefined;
    duration?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
}>;
export declare const bulkDeleteMediaSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    ids: string[];
}, {
    ids: string[];
}>;
export type PresignMediaInput = z.infer<typeof presignMediaSchema>;
export type PresignMediaBatchInput = z.infer<typeof presignMediaBatchSchema>;
export type CompleteMediaInput = z.infer<typeof completeMediaSchema>;
export type BulkDeleteMediaInput = z.infer<typeof bulkDeleteMediaSchema>;
//# sourceMappingURL=media.validator.d.ts.map