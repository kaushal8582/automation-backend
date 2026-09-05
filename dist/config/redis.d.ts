import { Redis } from 'ioredis';
export type RedisStatus = 'ok' | 'error' | 'disconnected';
export declare function getRedis(): Redis;
export declare function connectRedis(): Promise<void>;
export declare function disconnectRedis(): Promise<void>;
export declare function getRedisStatus(): Promise<RedisStatus>;
/** BullMQ-compatible connection options derived from REDIS_URL */
export declare function getBullMqConnectionOptions(): {
    url: string;
};
//# sourceMappingURL=redis.d.ts.map