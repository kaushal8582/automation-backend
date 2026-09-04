import mongoose, { type Document, type Model, Schema, Types } from 'mongoose';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../types/domain.js';

/**
 * Analytics-ready metrics model (v1 stub).
 * Not populated in Phase 3 — reserved for later insights ingestion.
 */
export interface ISocialPostMetrics {
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  destinationId: Types.ObjectId;
  socialAccountId: Types.ObjectId;
  platform: SocialPlatform;
  platformPostId?: string;
  views?: number;
  likes?: number;
  comments?: number;
  reach?: number;
  shares?: number;
  fetchedAt?: Date;
  raw?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISocialPostMetricsDocument extends ISocialPostMetrics, Document {}

const socialPostMetricsSchema = new Schema<ISocialPostMetricsDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'PostDestination',
      required: true,
      unique: true,
    },
    socialAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'SocialAccount',
      required: true,
    },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    platformPostId: { type: String, trim: true },
    views: { type: Number, min: 0 },
    likes: { type: Number, min: 0 },
    comments: { type: Number, min: 0 },
    reach: { type: Number, min: 0 },
    shares: { type: Number, min: 0 },
    fetchedAt: { type: Date },
    raw: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

socialPostMetricsSchema.index({ userId: 1, fetchedAt: -1 });

export const SocialPostMetrics: Model<ISocialPostMetricsDocument> =
  mongoose.models.SocialPostMetrics ??
  mongoose.model<ISocialPostMetricsDocument>('SocialPostMetrics', socialPostMetricsSchema);
