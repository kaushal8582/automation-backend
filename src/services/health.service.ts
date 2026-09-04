import { getMongoStatus } from '../config/mongo.js';
import { getRedisStatus } from '../config/redis.js';
import type { HealthResponse } from '../types/health.js';

export async function getHealthStatus(): Promise<HealthResponse> {
  const mongodb = getMongoStatus();
  const redis = await getRedisStatus();
  const api = 'ok' as const;

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
