import { randomUUID } from 'node:crypto';
import { getRedis } from '../config/redis.js';
const IG_STATE_PREFIX = 'oauth:ig:state:';
const FB_STATE_PREFIX = 'oauth:fb:state:';
const STATE_TTL_SECONDS = 60 * 10;
export async function createOAuthState(payload) {
    const state = randomUUID();
    await getRedis().set(`${IG_STATE_PREFIX}${state}`, JSON.stringify(payload), 'EX', STATE_TTL_SECONDS);
    return state;
}
export async function consumeOAuthState(state) {
    const key = `${IG_STATE_PREFIX}${state}`;
    const raw = await getRedis().get(key);
    if (!raw)
        return null;
    await getRedis().del(key);
    return JSON.parse(raw);
}
export async function createFacebookOAuthState(payload) {
    const state = randomUUID();
    await getRedis().set(`${FB_STATE_PREFIX}${state}`, JSON.stringify(payload), 'EX', STATE_TTL_SECONDS);
    return state;
}
export async function consumeFacebookOAuthState(state) {
    const key = `${FB_STATE_PREFIX}${state}`;
    const raw = await getRedis().get(key);
    if (!raw)
        return null;
    await getRedis().del(key);
    return JSON.parse(raw);
}
//# sourceMappingURL=oauth-state.service.js.map