import { AppError } from '../../middlewares/error-handler.js';
import { FacebookImportProvider } from './facebook-import.provider.js';
import { InstagramImportProvider } from './instagram-import.provider.js';
const providers = {
    instagram: new InstagramImportProvider(),
    facebook: new FacebookImportProvider(),
};
export function getContentImportProvider(platform) {
    const provider = providers[platform];
    if (!provider) {
        throw new AppError('This source cannot be imported automatically. Connect the account or upload the media directly.', 400, 'IMPORT_SOURCE_UNSUPPORTED', { platform });
    }
    return provider;
}
export function listImportablePlatforms() {
    return Object.keys(providers);
}
//# sourceMappingURL=index.js.map