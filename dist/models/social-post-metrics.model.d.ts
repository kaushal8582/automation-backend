import { type Document, type Model, Types } from 'mongoose';
import { type SocialPlatform } from '../types/domain.js';
/**
 * Analytics-ready metrics model (v1 stub).
 * Not populated in Phase 3 — reserved for later insights ingestion.
 */
export interface ISocialPostMetrics {
    userId: Types.ObjectId;
    postId: Types.ObjectId;
    destinationId: Types.ObjectId;
    socialAccountId: Types.ObjectId;
    platform: SocialPlatform;
    platformPostId?: string;
    views?: number;
    likes?: number;
    comments?: number;
    reach?: number;
    shares?: number;
    fetchedAt?: Date;
    raw?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export interface ISocialPostMetricsDocument extends ISocialPostMetrics, Document {
}
export declare const SocialPostMetrics: Model<ISocialPostMetricsDocument>;
//# sourceMappingURL=social-post-metrics.model.d.ts.map