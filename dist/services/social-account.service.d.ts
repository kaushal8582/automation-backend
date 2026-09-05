import { type ISocialAccountDocument } from '../models/social-account.model.js';
import type { InstagramTestPublishInput, ManualSocialAccountInput } from '../validators/social.validator.js';
export type PublicSocialAccount = {
    id: string;
    platform: ISocialAccountDocument['platform'];
    accountType: ISocialAccountDocument['accountType'];
    platformAccountId: string;
    username?: string;
    displayName?: string;
    profilePicture?: string;
    permissions: string[];
    status: ISocialAccountDocument['status'];
    tokenExpiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};
export declare function listSocialAccounts(userId: string): Promise<PublicSocialAccount[]>;
export declare function connectManualSocialAccount(userId: string, input: ManualSocialAccountInput): Promise<PublicSocialAccount>;
export declare function deleteSocialAccount(userId: string, accountId: string): Promise<void>;
export declare function testPublishInstagramReel(userId: string, input: InstagramTestPublishInput): Promise<{
    platformContainerId: string;
    platformPostId: string;
    videoUrl: string;
    usedTemporaryUrl: boolean;
}>;
//# sourceMappingURL=social-account.service.d.ts.map