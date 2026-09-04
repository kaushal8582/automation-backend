import mongoose, { type Document, type Model, Schema, Types } from 'mongoose';
import {
  DESTINATION_STATUSES,
  SOCIAL_PLATFORMS,
  type DestinationStatus,
  type SocialPlatform,
} from '../types/domain.js';

export interface IPostDestination {
  postId: Types.ObjectId;
  socialAccountId: Types.ObjectId;
  platform: SocialPlatform;
  status: DestinationStatus;
  scheduledAt?: Date;
  platformContainerId?: string;
  platformPostId?: string;
  platformPostUrl?: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  lastErrorCode?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPostDestinationDocument extends IPostDestination, Document {}

const postDestinationSchema = new Schema<IPostDestinationDocument>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    socialAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'SocialAccount',
      required: true,
      index: true,
    },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    status: {
      type: String,
      enum: DESTINATION_STATUSES,
      required: true,
      default: 'pending',
    },
    scheduledAt: { type: Date },
    platformContainerId: { type: String, trim: true },
    platformPostId: { type: String, trim: true },
    platformPostUrl: { type: String, trim: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    maxAttempts: { type: Number, required: true, default: 3, min: 1 },
    lastError: { type: String },
    lastErrorCode: { type: String },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

postDestinationSchema.index({ postId: 1, socialAccountId: 1 }, { unique: true });
postDestinationSchema.index({ status: 1, scheduledAt: 1 });
postDestinationSchema.index({ scheduledAt: 1 });
postDestinationSchema.index({ platformPostId: 1 }, { sparse: true });

export const PostDestination: Model<IPostDestinationDocument> =
  mongoose.models.PostDestination ??
  mongoose.model<IPostDestinationDocument>('PostDestination', postDestinationSchema);
