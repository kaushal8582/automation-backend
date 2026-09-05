import mongoose, { Schema } from 'mongoose';
import { DESTINATION_STATUSES, SOCIAL_PLATFORMS, } from '../types/domain.js';
const postDestinationSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    socialAccountId: {
        type: Schema.Types.ObjectId,
        ref: 'SocialAccount',
        required: true,
        index: true,
    },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    status: {
        type: String,
        enum: DESTINATION_STATUSES,
        required: true,
        default: 'pending',
    },
    scheduledAt: { type: Date },
    platformContainerId: { type: String, trim: true },
    platformPostId: { type: String, trim: true },
    platformPostUrl: { type: String, trim: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    maxAttempts: { type: Number, required: true, default: 3, min: 1 },
    lastError: { type: String },
    lastErrorCode: { type: String },
    publishedAt: { type: Date },
}, { timestamps: true });
postDestinationSchema.index({ postId: 1, socialAccountId: 1 }, { unique: true });
postDestinationSchema.index({ status: 1, scheduledAt: 1 });
postDestinationSchema.index({ scheduledAt: 1 });
postDestinationSchema.index({ platformPostId: 1 }, { sparse: true });
export const PostDestination = mongoose.models.PostDestination ??
    mongoose.model('PostDestination', postDestinationSchema);
//# sourceMappingURL=post-destination.model.js.map