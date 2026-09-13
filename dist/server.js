import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo, disconnectMongo } from './config/mongo.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { syncMediaAssetIndexes } from './services/media-indexes.js';
import { createLogger } from './utils/logger.js';
const logger = createLogger('server');
async function bootstrap() {
    await connectMongo();
    logger.info('MongoDB connected');
    await syncMediaAssetIndexes();
    await connectRedis();
    logger.info('Redis connected');
    const app = createApp();
    const server = app.listen(env.PORT, () => {
        logger.info('API listening', {
            port: env.PORT,
            env: env.NODE_ENV,
            igPublicImportConfigured: Boolean(env.IG_AUTH ?? env.VIDSSAVE_AUTH),
        });
    });
    const shutdown = async (signal) => {
        logger.info('Shutting down', { signal });
        server.close(async () => {
            await disconnectRedis();
            await disconnectMongo();
            process.exit(0);
        });
    };
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
bootstrap().catch((error) => {
    logger.error('Failed to start API', {
        error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
});
//# sourceMappingURL=server.js.map