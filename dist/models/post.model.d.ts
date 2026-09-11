import { type Document, type Model, Types } from 'mongoose';
import { type PostStatus, type PublishMode } from '../types/domain.js';
export interface IPost {
    userId: Types.ObjectId;
    mediaId: Types.ObjectId;
    thumbnailMediaId?: Types.ObjectId;
    caption: string;
    instagramCaption?: string;
    facebookCaption?: string;
    publishMode: PublishMode;
    scheduledAt?: Date;
    timezone: string;
    status: PostStatus;
    totalDestinations: number;
    successfulDestinations: number;
    failedDestinations: number;
    publishOptions?: {
        shareToFeed?: boolean;
        hideLikeCount?: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface IPostDocument extends IPost, Document {
}
export declare const Post: Model<IPostDocument>;
//# sourceMappingURL=post.model.d.ts.map