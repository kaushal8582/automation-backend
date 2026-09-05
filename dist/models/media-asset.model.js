import mongoose, { Schema } from 'mongoose';
import { MEDIA_STATUSES, MEDIA_TYPES, } from '../types/domain.js';
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
}, { timestamps: true });
mediaAssetSchema.index({ userId: 1, createdAt: -1 });
mediaAssetSchema.index({ status: 1 });
export const MediaAsset = mongoose.models.MediaAsset ??
    mongoose.model('MediaAsset', mediaAssetSchema);
//# sourceMappingURL=media-asset.model.js.map