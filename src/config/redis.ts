import { Redis } from 'ioredis';
import { env } from './env.js';

export type RedisStatus = 'ok' | 'error' | 'disconnected';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  if (client.status === 'ready') {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
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

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export async function getRedisStatus(): Promise<RedisStatus> {
  try {
    const client = getRedis();
    if (client.status !== 'ready') {
      return 'disconnected';
    }
    const pong = await client.ping();
    return pong === 'PONG' ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

/** BullMQ-compatible connection options derived from REDIS_URL */
export function getBullMqConnectionOptions(): { url: string } {
  return { url: env.REDIS_URL };
}
