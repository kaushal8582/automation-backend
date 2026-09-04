import mongoose, { type Document, type Model, Schema, Types } from 'mongoose';
import {
  MEDIA_STATUSES,
  MEDIA_TYPES,
  type MediaStatus,
  type MediaType,
} from '../types/domain.js';

export interface IMediaAsset {
  userId: Types.ObjectId;
  type: MediaType;
  originalFilename: string;
  r2Key: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  duration?: number;
  width?: number;
  height?: number;
  status: MediaStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMediaAssetDocument extends IMediaAsset, Document {}

const mediaAssetSchema = new Schema<IMediaAssetDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: MEDIA_TYPES, required: true },
    originalFilename: { type: String, required: true, trim: true },
    r2Key: { type: String, required: true, unique: true, trim: true },
    publicUrl: { type: String, trim: true, default: '' },
    mimeType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    duration: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    status: {
      type: String,
      enum: MEDIA_STATUSES,
      required: true,
      default: 'uploading',
    },
  },
  { timestamps: true },
);

mediaAssetSchema.index({ userId: 1, createdAt: -1 });
mediaAssetSchema.index({ status: 1 });

export const MediaAsset: Model<IMediaAssetDocument> =
  mongoose.models.MediaAsset ??
  mongoose.model<IMediaAssetDocument>('MediaAsset', mediaAssetSchema);
