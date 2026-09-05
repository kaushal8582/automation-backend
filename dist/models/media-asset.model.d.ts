import { type Document, type Model, Types } from 'mongoose';
import { type MediaStatus, type MediaType } from '../types/domain.js';
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
export interface IMediaAssetDocument extends IMediaAsset, Document {
}
export declare const MediaAsset: Model<IMediaAssetDocument>;
//# sourceMappingURL=media-asset.model.d.ts.map