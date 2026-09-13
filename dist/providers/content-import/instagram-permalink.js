import { AppError } from '../../middlewares/error-handler.js';
const IG_HOSTS = new Set([
    'instagram.com',
    'www.instagram.com',
    'm.instagram.com',
    'instagr.am',
    'www.instagr.am',
]);
/** Query keys Instagram share links use that can unlock media/audio for the parser. */
const PROVIDER_QUERY_KEYS = ['stkn', 'igsh', 'igshid'];
function buildProviderUrl(pathKind, shortcode, source) {
    const base = `https://www.instagram.com/${pathKind}/${shortcode}/`;
    const kept = new URLSearchParams();
    for (const key of PROVIDER_QUERY_KEYS) {
        const value = source.searchParams.get(key);
        if (value)
            kept.set(key, value);
    }
    const qs = kept.toString();
    return qs ? `${base}?${qs}` : base;
}
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
export function parseInstagramMediaUrl(rawUrl) {
    let url;
    try {
        url = new URL(rawUrl.trim());
    }
    catch {
        return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
        return null;
    const host = url.hostname.toLowerCase();
    if (!IG_HOSTS.has(host))
        return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2)
        return null;
    const kindRaw = parts[0].toLowerCase();
    const kind = kindRaw === 'reel' || kindRaw === 'reels'
        ? 'reel'
        : kindRaw === 'p'
            ? 'post'
            : kindRaw === 'tv'
                ? 'tv'
                : null;
    if (!kind)
        return null;
    const shortcode = parts[1];
    if (!shortcode || !/^[A-Za-z0-9_-]+$/.test(shortcode))
        return null;
    const pathKind = kind === 'reel' ? 'reel' : kind === 'tv' ? 'tv' : 'p';
    return {
        shortcode,
        kind,
        normalizedUrl: `https://www.instagram.com/${pathKind}/${shortcode}/`,
        providerUrl: buildProviderUrl(pathKind, shortcode, url),
    };
}
export function isInstagramMediaUrl(url) {
    return parseInstagramMediaUrl(url) !== null;
}
export function permalinkContainsShortcode(permalink, shortcode) {
    if (!permalink)
        return false;
    const parsed = parseInstagramMediaUrl(permalink);
    if (parsed)
        return parsed.shortcode === shortcode;
    // Fallback: shortcode appears as a path segment
    return new RegExp(`/(?:reel|reels|p|tv)/${shortcode}(?:/|\\?|$)`, 'i').test(permalink);
}
export function assertInstagramMediaUrl(url) {
    const parsed = parseInstagramMediaUrl(url);
    if (!parsed) {
        throw new AppError('Not a valid Instagram reel/post URL.', 400, 'IMPORT_SOURCE_UNSUPPORTED');
    }
    return parsed;
}
//# sourceMappingURL=instagram-permalink.js.map