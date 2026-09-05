import { type IMediaAssetDocument } from '../models/media-asset.model.js';
import type { CompleteMediaInput, PresignMediaBatchInput, PresignMediaInput } from '../validators/media.validator.js';
export type PresignedUploadResult = {
    uploadUrl: string;
    r2Key: string;
    publicUrl: string;
    headers: {
        'Content-Type': string;
    };
    expiresIn: number;
};
export type PublicMediaAsset = {
    id: string;
    type: IMediaAssetDocument['type'];
    originalFilename: string;
    r2Key: string;
    publicUrl: string;
    mimeType: string;
    fileSize: number;
    duration?: number;
    width?: number;
    height?: number;
    status: IMediaAssetDocument['status'];
    createdAt: Date;
    updatedAt: Date;
};
export declare function createPresignedUpload(userId: string, input: PresignMediaInput): Promise<PresignedUploadResult>;
export declare function createPresignedUploadBatch(userId: string, input: PresignMediaBatchInput): Promise<{
    uploads: Array<PresignedUploadResult & {
        clientIndex: number;
    }>;
}>;
export declare function completeMediaUpload(userId: string, input: CompleteMediaInput): Promise<PublicMediaAsset>;
export declare function listMediaForUser(userId: string): Promise<PublicMediaAsset[]>;
export declare function getMediaForUser(userId: string, mediaId: string): Promise<PublicMediaAsset>;
export declare function deleteMediaForUser(userId: string, mediaId: string): Promise<void>;
export declare function bulkDeleteMediaForUser(userId: string, ids: string[]): Promise<{
    deletedCount: number;
}>;
export declare function getMediaUploadLimits(): {
    maxUploadBytes: number;
};
//# sourceMappingURL=media.service.d.ts.map