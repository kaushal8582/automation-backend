import { MediaAsset } from '../models/media-asset.model.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('media-indexes');

/**
 * Drop legacy unique index that blocked multiple imports from the same
 * Instagram shortcode (video + audio + qualities share sourceExternalId).
 */
export async function syncMediaAssetIndexes(): Promise<void> {
  try {
    const indexes = await MediaAsset.collection.indexes();
    const legacy = indexes.find(
      (idx) =>
        idx.name === 'userId_1_sourcePlatform_1_sourceExternalId_1' &&
        !idx.partialFilterExpression,
    );
    if (legacy?.name) {
      await MediaAsset.collection.dropIndex(legacy.name);
      logger.info('Dropped legacy MediaAsset unique index', { name: legacy.name });
    }
  } catch (error) {
    logger.warn('Could not inspect/drop legacy MediaAsset index', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await MediaAsset.syncIndexes();
  } catch (error) {
    logger.warn('MediaAsset.syncIndexes failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
