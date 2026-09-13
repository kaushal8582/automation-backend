import { z } from 'zod';
export declare const listAccountMediaQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
}, {
    limit?: number | undefined;
    cursor?: string | undefined;
}>;
export declare const importAccountMediaSchema: z.ZodObject<{
    externalIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    externalIds: string[];
}, {
    externalIds: string[];
}>;
export declare const importUrlSchema: z.ZodObject<{
    url: z.ZodString;
    socialAccountId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    socialAccountId?: string | undefined;
}, {
    url: string;
    socialAccountId?: string | undefined;
}>;
export declare const instagramPublicPreviewSchema: z.ZodObject<{
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    url: string;
}, {
    url: string;
}>;
export declare const instagramPublicImportSchema: z.ZodObject<{
    sourceUrl: z.ZodString;
    resourceIds: z.ZodArray<z.ZodString, "many">;
    rightsConfirmed: z.ZodLiteral<true>;
    forceDuplicate: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    sourceUrl: string;
    rightsConfirmed: true;
    resourceIds: string[];
    forceDuplicate: boolean;
}, {
    sourceUrl: string;
    rightsConfirmed: true;
    resourceIds: string[];
    forceDuplicate?: boolean | undefined;
}>;
export declare const importJobsQuerySchema: z.ZodObject<{
    ids: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ids: string;
}, {
    ids: string;
}>;
export type ListAccountMediaQuery = z.infer<typeof listAccountMediaQuerySchema>;
export type ImportAccountMediaInput = z.infer<typeof importAccountMediaSchema>;
export type ImportUrlInput = z.infer<typeof importUrlSchema>;
export type InstagramPublicPreviewInput = z.infer<typeof instagramPublicPreviewSchema>;
export type InstagramPublicImportInput = z.infer<typeof instagramPublicImportSchema>;
//# sourceMappingURL=content-import.validator.d.ts.map