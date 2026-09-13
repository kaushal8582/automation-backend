import { type Document, type Model, Types } from 'mongoose';
import { type MediaSourceType, type MediaStatus, type MediaType, type SocialPlatform } from '../types/domain.js';
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
    /** How this asset entered the library (optional for legacy uploads). */
    sourceType?: MediaSourceType;
    sourcePlatform?: SocialPlatform | 'url';
    sourceAccountId?: Types.ObjectId;
    sourceExternalId?: string;
    sourceResourceId?: string;
    sourcePostUrl?: string;
    sourceCaption?: string;
    sourceTitle?: string;
    sourceThumbnail?: string;
    importedAt?: Date;
    sourceMetadata?: Record<string, unknown>;
    originalThumbnailUrl?: string;
    thumbnailR2Key?: string;
    thumbnailPublicUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IMediaAssetDocument extends IMediaAsset, Document {
}
export declare const MediaAsset: Model<IMediaAssetDocument>;
//# sourceMappingURL=media-asset.model.d.ts.map