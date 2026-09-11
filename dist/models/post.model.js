import mongoose, { Schema } from 'mongoose';
import { POST_STATUSES, PUBLISH_MODES, } from '../types/domain.js';
const postSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaId: { type: Schema.Types.ObjectId, ref: 'MediaAsset', required: true },
    thumbnailMediaId: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
    caption: { type: String, default: '', maxlength: 5000 },
    instagramCaption: { type: String, maxlength: 5000 },
    facebookCaption: { type: String, maxlength: 5000 },
    publishMode: { type: String, enum: PUBLISH_MODES, required: true },
    scheduledAt: { type: Date },
    timezone: { type: String, required: true, default: 'UTC', maxlength: 64 },
    status: {
        type: String,
        enum: POST_STATUSES,
        required: true,
        default: 'draft',
    },
    totalDestinations: { type: Number, required: true, default: 0, min: 0 },
    successfulDestinations: { type: Number, required: true, default: 0, min: 0 },
    failedDestinations: { type: Number, required: true, default: 0, min: 0 },
    publishOptions: {
        shareToFeed: { type: Boolean },
        hideLikeCount: { type: Boolean },
    },
}, { timestamps: true });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ userId: 1, status: 1 });
postSchema.index({ status: 1, scheduledAt: 1 });
export const Post = mongoose.models.Post ?? mongoose.model('Post', postSchema);
//# sourceMappingURL=post.model.js.map