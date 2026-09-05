export type PublicMetrics = {
    id: string;
    destinationId: string;
    platform: string;
    platformPostId?: string;
    views?: number;
    likes?: number;
    comments?: number;
    reach?: number;
    shares?: number;
    fetchedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};
export declare function syncDestinationMetrics(destinationId: string, userId: string): Promise<void>;
export declare function syncPostMetrics(postId: string, userId: string): Promise<void>;
export declare function syncRecentMetrics(): Promise<void>;
export declare function getPostMetrics(userId: string, postId: string): Promise<PublicMetrics[]>;
//# sourceMappingURL=metrics.service.d.ts.map