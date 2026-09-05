import { type Document, type Model, Types } from 'mongoose';
import { type DestinationStatus, type SocialPlatform } from '../types/domain.js';
export interface IPostDestination {
    postId: Types.ObjectId;
    socialAccountId: Types.ObjectId;
    platform: SocialPlatform;
    status: DestinationStatus;
    scheduledAt?: Date;
    platformContainerId?: string;
    platformPostId?: string;
    platformPostUrl?: string;
    attempts: number;
    maxAttempts: number;
    lastError?: string;
    lastErrorCode?: string;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface IPostDestinationDocument extends IPostDestination, Document {
}
export declare const PostDestination: Model<IPostDestinationDocument>;
//# sourceMappingURL=post-destination.model.d.ts.map