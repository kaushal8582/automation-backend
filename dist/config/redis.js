import { Redis } from 'ioredis';
import { env } from './env.js';
let redisClient = null;
export function getRedis() {
    if (!redisClient) {
        redisClient = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
        });
    }
    return redisClient;
}
export async function connectRedis() {
    const client = getRedis();
    if (client.status === 'ready') {
        return;
    }
    await new Promise((resolve, reject) => {
        const onReady = () => {
            cleanup();
            resolve();
        };
        const onError = (error) => {
            cleanup();
            reject(error);
        };
        const cleanup = () => {
            client.off('ready', onReady);
            client.off('error', onError);
        };
        client.once('ready', onReady);
        client.once('error', onError);
    });
}
export async function disconnectRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
export async function getRedisStatus() {
    try {
        const client = getRedis();
        if (client.status !== 'ready') {
            return 'disconnected';
        }
        const pong = await client.ping();
        return pong === 'PONG' ? 'ok' : 'error';
    }
    catch {
        return 'error';
    }
}
/** BullMQ-compatible connection options derived from REDIS_URL */
export function getBullMqConnectionOptions() {
    return { url: env.REDIS_URL };
}
//# sourceMappingURL=redis.js.map