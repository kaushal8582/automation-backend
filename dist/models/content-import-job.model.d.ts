import { type Document, type Model, Types } from 'mongoose';
import { type ContentImportJobStatus, type MediaSourceType, type SocialPlatform } from '../types/domain.js';
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
export interface IContentImportJobDocument extends IContentImportJob, Document {
}
export declare const ContentImportJob: Model<IContentImportJobDocument>;
//# sourceMappingURL=content-import-job.model.d.ts.map