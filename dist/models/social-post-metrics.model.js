import mongoose, { Schema } from 'mongoose';
import { SOCIAL_PLATFORMS } from '../types/domain.js';
const socialPostMetricsSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    destinationId: {
        type: Schema.Types.ObjectId,
        ref: 'PostDestination',
        required: true,
        unique: true,
    },
    socialAccountId: {
        type: Schema.Types.ObjectId,
        ref: 'SocialAccount',
        required: true,
    },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    platformPostId: { type: String, trim: true },
    views: { type: Number, min: 0 },
    likes: { type: Number, min: 0 },
    comments: { type: Number, min: 0 },
    reach: { type: Number, min: 0 },
    shares: { type: Number, min: 0 },
    fetchedAt: { type: Date },
    raw: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
socialPostMetricsSchema.index({ userId: 1, fetchedAt: -1 });
export const SocialPostMetrics = mongoose.models.SocialPostMetrics ??
    mongoose.model('SocialPostMetrics', socialPostMetricsSchema);
//# sourceMappingURL=social-post-metrics.model.js.map