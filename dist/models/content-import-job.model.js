import mongoose, { Schema } from 'mongoose';
import { CONTENT_IMPORT_JOB_STATUSES, MEDIA_SOURCE_TYPES, SOCIAL_PLATFORMS, } from '../types/domain.js';
const contentImportJobSchema = new Schema({
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
}, { timestamps: true });
contentImportJobSchema.index({ userId: 1, createdAt: -1 });
contentImportJobSchema.index({ userId: 1, status: 1 });
contentImportJobSchema.index({ status: 1, createdAt: 1 });
export const ContentImportJob = mongoose.models.ContentImportJob ??
    mongoose.model('ContentImportJob', contentImportJobSchema);
//# sourceMappingURL=content-import-job.model.js.map