import { getMongoStatus } from '../config/mongo.js';
import { getRedisStatus } from '../config/redis.js';
export async function getHealthStatus() {
    const mongodb = getMongoStatus();
    const redis = await getRedisStatus();
    const api = 'ok';
    const success = mongodb === 'ok' && redis === 'ok';
    return {
        success,
        services: {
            api,
            mongodb,
            redis,
        },
    };
}
//# sourceMappingURL=health.service.js.map