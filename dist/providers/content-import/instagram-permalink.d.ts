export type InstagramPermalinkKind = 'reel' | 'post' | 'tv';
export type ParsedInstagramPermalink = {
    shortcode: string;
    kind: InstagramPermalinkKind;
    /** Canonical URL without tracking params (for display / identity). */
    normalizedUrl: string;
    /** URL sent to the third-party parser — keeps share tokens (stkn, igsh). */
    providerUrl: string;
};
/**
 * Parse Instagram reel / post / IGTV share URLs.
 * Examples:
 *  - https://www.instagram.com/reel/SHORTCODE/
 *  - https://www.instagram.com/reels/SHORTCODE/
 *  - https://www.instagram.com/p/SHORTCODE/
 *  - https://www.instagram.com/tv/SHORTCODE/
 *  - https://instagr.am/p/SHORTCODE/
 *  - https://www.instagram.com/reel/SHORTCODE/?stkn=...
 */
export declare function parseInstagramMediaUrl(rawUrl: string): ParsedInstagramPermalink | null;
export declare function isInstagramMediaUrl(url: string): boolean;
export declare function permalinkContainsShortcode(permalink: string | undefined, shortcode: string): boolean;
export declare function assertInstagramMediaUrl(url: string): ParsedInstagramPermalink;
//# sourceMappingURL=instagram-permalink.d.ts.map