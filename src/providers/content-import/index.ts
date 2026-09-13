import { AppError } from '../../middlewares/error-handler.js';
import type { SocialPlatform } from '../../types/domain.js';
import { FacebookImportProvider } from './facebook-import.provider.js';
import { InstagramImportProvider } from './instagram-import.provider.js';
import type { ContentImportProvider } from './types.js';

const providers: Record<SocialPlatform, ContentImportProvider> = {
  instagram: new InstagramImportProvider(),
  facebook: new FacebookImportProvider(),
};

export function getContentImportProvider(platform: SocialPlatform): ContentImportProvider {
  const provider = providers[platform];
  if (!provider) {
    throw new AppError(
      'This source cannot be imported automatically. Connect the account or upload the media directly.',
      400,
      'IMPORT_SOURCE_UNSUPPORTED',
      { platform },
    );
  }
  return provider;
}

export function listImportablePlatforms(): SocialPlatform[] {
  return Object.keys(providers) as SocialPlatform[];
}
