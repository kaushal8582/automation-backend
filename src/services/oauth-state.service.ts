import { randomUUID } from 'node:crypto';
import { getRedis } from '../config/redis.js';

const IG_STATE_PREFIX = 'oauth:ig:state:';
const FB_STATE_PREFIX = 'oauth:fb:state:';
const STATE_TTL_SECONDS = 60 * 10;

export type OAuthStatePayload = {
  userId: string;
  reconnectAccountId?: string;
};

/** @deprecated alias — kept for backwards compat */
export type InstagramOAuthStatePayload = OAuthStatePayload;

export async function createOAuthState(payload: OAuthStatePayload): Promise<string> {
  const state = randomUUID();
  await getRedis().set(
    `${IG_STATE_PREFIX}${state}`,
    JSON.stringify(payload),
    'EX',
    STATE_TTL_SECONDS,
  );
  return state;
}

export async function consumeOAuthState(state: string): Promise<OAuthStatePayload | null> {
  const key = `${IG_STATE_PREFIX}${state}`;
  const raw = await getRedis().get(key);
  if (!raw) return null;
  await getRedis().del(key);
  return JSON.parse(raw) as OAuthStatePayload;
}

export async function createFacebookOAuthState(payload: OAuthStatePayload): Promise<string> {
  const state = randomUUID();
  await getRedis().set(
    `${FB_STATE_PREFIX}${state}`,
    JSON.stringify(payload),
    'EX',
    STATE_TTL_SECONDS,
  );
  return state;
}

export async function consumeFacebookOAuthState(state: string): Promise<OAuthStatePayload | null> {
  const key = `${FB_STATE_PREFIX}${state}`;
  const raw = await getRedis().get(key);
  if (!raw) return null;
  await getRedis().del(key);
  return JSON.parse(raw) as OAuthStatePayload;
}
