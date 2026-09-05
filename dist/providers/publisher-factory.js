import { AppError } from '../middlewares/error-handler.js';
import { InstagramPublisher } from './instagram/instagram-publisher.js';
import { FacebookPublisher } from './facebook/facebook-publisher.js';
export function getPublisher(platform) {
    switch (platform) {
        case 'instagram':
            return new InstagramPublisher();
        case 'facebook':
            return new FacebookPublisher();
        default:
            throw new AppError(`Unsupported platform: ${platform}`, 400, 'UNSUPPORTED_PLATFORM');
    }
}
//# sourceMappingURL=publisher-factory.js.map