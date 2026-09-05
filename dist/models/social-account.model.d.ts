import { type Document, type Model, Types } from 'mongoose';
import { type SocialAccountStatus, type SocialAccountType, type SocialPlatform } from '../types/domain.js';
export interface ISocialAccount {
    userId: Types.ObjectId;
    platform: SocialPlatform;
    accountType: SocialAccountType;
    platformAccountId: string;
    username?: string;
    displayName?: string;
    profilePicture?: string;
    accessTokenEncrypted: string;
    tokenExpiresAt?: Date;
    permissions: string[];
    status: SocialAccountStatus;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export interface ISocialAccountDocument extends ISocialAccount, Document {
}
export declare const SocialAccount: Model<ISocialAccountDocument>;
//# sourceMappingURL=social-account.model.d.ts.map