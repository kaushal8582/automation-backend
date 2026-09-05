import { z } from 'zod';
export declare const manualSocialAccountSchema: z.ZodObject<{
    platform: z.ZodEnum<["instagram", "facebook"]>;
    accountType: z.ZodEnum<["instagram_business", "instagram_creator", "facebook_page"]>;
    platformAccountId: z.ZodString;
    username: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    profilePicture: z.ZodOptional<z.ZodString>;
    accessToken: z.ZodString;
    tokenExpiresAt: z.ZodOptional<z.ZodDate>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
    platform: "instagram" | "facebook";
    accountType: "instagram_business" | "instagram_creator" | "facebook_page";
    platformAccountId: string;
    username?: string | undefined;
    displayName?: string | undefined;
    profilePicture?: string | undefined;
    tokenExpiresAt?: Date | undefined;
    permissions?: string[] | undefined;
}, {
    accessToken: string;
    platform: "instagram" | "facebook";
    accountType: "instagram_business" | "instagram_creator" | "facebook_page";
    platformAccountId: string;
    username?: string | undefined;
    displayName?: string | undefined;
    profilePicture?: string | undefined;
    tokenExpiresAt?: Date | undefined;
    permissions?: string[] | undefined;
}>;
export declare const instagramTestPublishSchema: z.ZodObject<{
    socialAccountId: z.ZodString;
    mediaId: z.ZodString;
    caption: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    socialAccountId: string;
    mediaId: string;
    caption?: string | undefined;
}, {
    socialAccountId: string;
    mediaId: string;
    caption?: string | undefined;
}>;
export declare const instagramOAuthExchangeSchema: z.ZodObject<{
    code: z.ZodString;
    state: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    state: string;
}, {
    code: string;
    state: string;
}>;
export type ManualSocialAccountInput = z.infer<typeof manualSocialAccountSchema>;
export type InstagramTestPublishInput = z.infer<typeof instagramTestPublishSchema>;
export type InstagramOAuthExchangeInput = z.infer<typeof instagramOAuthExchangeSchema>;
//# sourceMappingURL=social.validator.d.ts.map