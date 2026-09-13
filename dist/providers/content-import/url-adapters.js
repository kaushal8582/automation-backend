import { AppError } from '../../middlewares/error-handler.js';
import { assertSafeExternalUrl } from '../../utils/safe-fetch.js';
const VIDEO_EXT = /\.(mp4|mov|m4v)(\?|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp)(\?|$)/i;
function guessMimeFromUrl(url) {
    if (VIDEO_EXT.test(url)) {
        const isMov = /\.mov(\?|$)/i.test(url);
        return {
            mimeType: isMov ? 'video/quicktime' : 'video/mp4',
            mediaType: 'video',
            filename: isMov ? 'import.mov' : 'import.mp4',
        };
    }
    if (IMAGE_EXT.test(url)) {
        if (/\.png(\?|$)/i.test(url)) {
            return { mimeType: 'image/png', mediaType: 'image', filename: 'import.png' };
        }
        if (/\.webp(\?|$)/i.test(url)) {
            return { mimeType: 'image/webp', mediaType: 'image', filename: 'import.webp' };
        }
        return { mimeType: 'image/jpeg', mediaType: 'image', filename: 'import.jpg' };
    }
    return null;
}
/**
 * Imports only direct public media CDN/file URLs (mp4/mov/jpeg/png/webp).
 * Does NOT claim Instagram/Facebook post-page URL support.
 */
export class DirectMediaUrlAdapter {
    id = 'direct-media-url';
    canHandle(url) {
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
                return false;
            return guessMimeFromUrl(url) !== null;
        }
        catch {
            return false;
        }
    }
    async preview(url) {
        await assertSafeExternalUrl(url);
        const guessed = guessMimeFromUrl(url);
        if (!guessed) {
            throw new AppError('This source cannot be imported automatically. Connect the account or upload the media directly.', 400, 'IMPORT_SOURCE_UNSUPPORTED');
        }
        return {
            url,
            mediaType: guessed.mediaType,
            mimeType: guessed.mimeType,
            filename: guessed.filename,
        };
    }
    async resolve(url) {
        const preview = await this.preview(url);
        return {
            directUrl: url,
            mimeType: preview.mimeType,
            filename: preview.filename,
        };
    }
}
export function getUrlImportAdapters() {
    return [new DirectMediaUrlAdapter()];
}
export function findUrlImportAdapter(url) {
    return getUrlImportAdapters().find((adapter) => adapter.canHandle(url)) ?? null;
}
//# sourceMappingURL=url-adapters.js.map