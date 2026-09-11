import { Types } from 'mongoose';
import { type IPostDocument } from '../models/post.model.js';
import { type IPostDestinationDocument } from '../models/post-destination.model.js';
import type { CreatePostInput, CreatePostsBatchInput } from '../validators/post.validator.js';
import type { DestinationStatus } from '../types/domain.js';
export type PublicPostDestination = {
    id: string;
    postId: string;
    socialAccountId: string;
    platform: IPostDestinationDocument['platform'];
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
};
export type PublicPost = {
    id: string;
    mediaId: string;
    thumbnailMediaId?: string;
    caption: string;
    instagramCaption?: string;
    facebookCaption?: string;
    publishMode: IPostDocument['publishMode'];
    scheduledAt?: Date;
    timezone: string;
    status: IPostDocument['status'];
    totalDestinations: number;
    successfulDestinations: number;
    failedDestinations: number;
    publishOptions?: {
        shareToFeed?: boolean;
        hideLikeCount?: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
};
export declare function toPublicDestination(dest: IPostDestinationDocument): PublicPostDestination;
export declare function toPublicPost(post: IPostDocument): PublicPost;
export declare function syncPostFromDestinations(postId: Types.ObjectId): Promise<IPostDocument>;
export declare function createPost(userId: string, input: CreatePostInput): Promise<{
    post: PublicPost;
    destinations: PublicPostDestination[];
    usedTemporaryUrl: boolean;
}>;
export declare function createPostsBatch(userId: string, input: CreatePostsBatchInput): Promise<{
    posts: PublicPost[];
    total: number;
    queuedDestinations: number;
    usedTemporaryUrl: boolean;
}>;
export declare function listPosts(userId: string, options?: {
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
    status?: IPostDocument['status'];
}): Promise<{
    posts: PublicPost[];
    total: number;
    limit: number;
    offset: number;
}>;
export declare function getPostById(userId: string, postId: string): Promise<{
    post: PublicPost;
    destinations: PublicPostDestination[];
}>;
export declare function cancelPost(userId: string, postId: string): Promise<{
    post: PublicPost;
    destinations: PublicPostDestination[];
}>;
export declare function retryPost(userId: string, postId: string, destinationIds?: string[]): Promise<{
    post: PublicPost;
    destinations: PublicPostDestination[];
    retriedCount: number;
}>;
//# sourceMappingURL=post.service.d.ts.map