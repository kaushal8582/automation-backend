import mongoose, { Schema } from 'mongoose';
import { MEDIA_SOURCE_TYPES, MEDIA_STATUSES, MEDIA_TYPES, SOCIAL_PLATFORMS, } from '../types/domain.js';
const mediaAssetSchema = new Schema({
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
    sourceType: { type: String, enum: MEDIA_SOURCE_TYPES },
    sourcePlatform: { type: String, enum: [...SOCIAL_PLATFORMS, 'url'] },
    sourceAccountId: { type: Schema.Types.ObjectId, ref: 'SocialAccount' },
    sourceExternalId: { type: String, trim: true },
    sourceResourceId: { type: String, trim: true },
    sourcePostUrl: { type: String, trim: true },
    sourceCaption: { type: String, maxlength: 5000 },
    sourceTitle: { type: String, maxlength: 5000 },
    sourceThumbnail: { type: String, trim: true },
    importedAt: { type: Date },
    sourceMetadata: { type: Schema.Types.Mixed },
    originalThumbnailUrl: { type: String, trim: true },
    thumbnailR2Key: { type: String, trim: true },
    thumbnailPublicUrl: { type: String, trim: true },
}, { timestamps: true });
mediaAssetSchema.index({ userId: 1, createdAt: -1 });
mediaAssetSchema.index({ status: 1 });
/** Legacy connected-account / URL imports (no resource id). */
mediaAssetSchema.index({ userId: 1, sourcePlatform: 1, sourceExternalId: 1 }, {
    unique: true,
    partialFilterExpression: {
        sourceExternalId: { $type: 'string' },
        sourcePlatform: { $type: 'string' },
        sourceResourceId: { $exists: false },
    },
    name: 'uniq_user_platform_external_legacy',
});
/** Public link imports: one asset per carousel/resource item. */
mediaAssetSchema.index({ userId: 1, sourcePlatform: 1, sourceExternalId: 1, sourceResourceId: 1 }, {
    unique: true,
    partialFilterExpression: {
        sourceExternalId: { $type: 'string' },
        sourcePlatform: { $type: 'string' },
        sourceResourceId: { $type: 'string' },
    },
    name: 'uniq_user_platform_external_resource',
});
export const MediaAsset = mongoose.models.MediaAsset ??
    mongoose.model('MediaAsset', mediaAssetSchema);
//# sourceMappingURL=media-asset.model.js.map