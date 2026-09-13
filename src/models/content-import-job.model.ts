import mongoose, { type Document, type Model, Schema, Types } from 'mongoose';
import {
  CONTENT_IMPORT_JOB_STATUSES,
  MEDIA_SOURCE_TYPES,
  SOCIAL_PLATFORMS,
  type ContentImportJobStatus,
  type MediaSourceType,
  type SocialPlatform,
} from '../types/domain.js';

export interface IContentImportJob {
  userId: Types.ObjectId;
  sourceType: MediaSourceType;
  sourcePlatform?: SocialPlatform | 'url';
  socialAccountId?: Types.ObjectId;
  externalId?: string;
  sourceResourceId?: string;
  sourceUrl?: string;
  status: ContentImportJobStatus;
  progress?: number;
  mediaAssetId?: Types.ObjectId;
  errorCode?: string;
  errorMessage?: string;
  caption?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContentImportJobDocument extends IContentImportJob, Document {}

const contentImportJobSchema = new Schema<IContentImportJobDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceType: { type: String, enum: MEDIA_SOURCE_TYPES, required: true },
    sourcePlatform: { type: String, enum: [...SOCIAL_PLATFORMS, 'url'] },
    socialAccountId: { type: Schema.Types.ObjectId, ref: 'SocialAccount' },
    externalId: { type: String, trim: true },
    sourceResourceId: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: CONTENT_IMPORT_JOB_STATUSES,
      required: true,
      default: 'pending',
    },
    progress: { type: Number, min: 0, max: 100 },
    mediaAssetId: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
    errorCode: { type: String, trim: true },
    errorMessage: { type: String },
    caption: { type: String, maxlength: 5000 },
    thumbnailUrl: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

contentImportJobSchema.index({ userId: 1, createdAt: -1 });
contentImportJobSchema.index({ userId: 1, status: 1 });
contentImportJobSchema.index({ status: 1, createdAt: 1 });

export const ContentImportJob: Model<IContentImportJobDocument> =
  mongoose.models.ContentImportJob ??
  mongoose.model<IContentImportJobDocument>('ContentImportJob', contentImportJobSchema);
