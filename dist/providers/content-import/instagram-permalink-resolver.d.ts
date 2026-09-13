import { type ParsedInstagramPermalink } from './instagram-permalink.js';
import type { ExternalMediaItem } from './types.js';
export type ResolvedOwnedInstagramMedia = {
    parsed: ParsedInstagramPermalink;
    account: {
        id: string;
        platformAccountId: string;
        username?: string;
        displayName?: string;
    };
    item: ExternalMediaItem;
    alreadyImported: boolean;
    existingMediaId?: string;
};
/**
 * Resolve a pasted Instagram reel/post URL to media owned by one of the user's
 * connected Instagram accounts via the official Graph API.
 *
 * Does NOT scrape Instagram HTML or download third-party public reels.
 */
export declare function resolveOwnedInstagramPermalink(userId: string, rawUrl: string, options?: {
    socialAccountId?: string;
}): Promise<ResolvedOwnedInstagramMedia>;
//# sourceMappingURL=instagram-permalink-resolver.d.ts.map