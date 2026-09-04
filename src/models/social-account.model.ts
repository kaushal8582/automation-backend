import mongoose, { type Document, type Model, Schema, Types } from 'mongoose';
import {
  SOCIAL_ACCOUNT_STATUSES,
  SOCIAL_ACCOUNT_TYPES,
  SOCIAL_PLATFORMS,
  type SocialAccountStatus,
  type SocialAccountType,
  type SocialPlatform,
} from '../types/domain.js';

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

export interface ISocialAccountDocument extends ISocialAccount, Document {}

const socialAccountSchema = new Schema<ISocialAccountDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    accountType: { type: String, enum: SOCIAL_ACCOUNT_TYPES, required: true },
    platformAccountId: { type: String, required: true, trim: true },
    username: { type: String, trim: true },
    displayName: { type: String, trim: true },
    profilePicture: { type: String, trim: true },
    accessTokenEncrypted: { type: String, required: true, select: false },
    tokenExpiresAt: { type: Date },
    permissions: { type: [String], default: [] },
    status: {
      type: String,
      enum: SOCIAL_ACCOUNT_STATUSES,
      required: true,
      default: 'active',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

socialAccountSchema.index({ userId: 1, platform: 1 });
socialAccountSchema.index(
  { userId: 1, platform: 1, platformAccountId: 1 },
  { unique: true },
);
socialAccountSchema.index({ status: 1 });

export const SocialAccount: Model<ISocialAccountDocument> =
  mongoose.models.SocialAccount ??
  mongoose.model<ISocialAccountDocument>('SocialAccount', socialAccountSchema);
