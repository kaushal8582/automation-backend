import { z } from 'zod';
import { SOCIAL_ACCOUNT_TYPES, SOCIAL_PLATFORMS } from '../types/domain.js';

export const manualSocialAccountSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  accountType: z.enum(SOCIAL_ACCOUNT_TYPES),
  platformAccountId: z.string().trim().min(1),
  username: z.string().trim().min(1).optional(),
  displayName: z.string().trim().min(1).optional(),
  profilePicture: z.string().url().optional(),
  accessToken: z.string().min(1),
  tokenExpiresAt: z.coerce.date().optional(),
  permissions: z.array(z.string()).optional(),
});

export const instagramTestPublishSchema = z.object({
  socialAccountId: z.string().min(1),
  mediaId: z.string().min(1),
  caption: z.string().max(2200).optional(),
});

export const instagramOAuthExchangeSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type ManualSocialAccountInput = z.infer<typeof manualSocialAccountSchema>;
export type InstagramTestPublishInput = z.infer<typeof instagramTestPublishSchema>;
export type InstagramOAuthExchangeInput = z.infer<typeof instagramOAuthExchangeSchema>;
