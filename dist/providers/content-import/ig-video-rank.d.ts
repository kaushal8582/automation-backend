/**
 * Prefer Instagram "Original"/progressive streams over re-encoded NxP ladders.
 * Ladder qualities (1080P, 720P, …) from the third-party parser are often video-only (VP9/h264 without AAC).
 */
export declare function isLadderQuality(quality: string): boolean;
export declare function rankVideoResource(resource: {
    quality: string;
    size?: number;
}): number;
export declare function pickPreferredVideo<T extends {
    quality: string;
    size?: number;
}>(videos: T[]): T | undefined;
//# sourceMappingURL=ig-video-rank.d.ts.map