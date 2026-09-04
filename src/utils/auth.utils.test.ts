import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  getRefreshTokenTtlSeconds,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

describe('password utils', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('SecurePass123!');
    expect(hash).not.toBe('SecurePass123!');
    await expect(verifyPassword('SecurePass123!', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });
});

describe('jwt utils', () => {
  it('signs and verifies access tokens', () => {
    const token = signAccessToken('user123', 'user@example.com');
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user123');
    expect(payload.email).toBe('user@example.com');
    expect(payload.type).toBe('access');
  });

  it('signs and verifies refresh tokens with jti', () => {
    const { token, jti } = signRefreshToken('user123');
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user123');
    expect(payload.type).toBe('refresh');
    expect(payload.jti).toBe(jti);
  });

  it('parses refresh TTL seconds', () => {
    expect(getRefreshTokenTtlSeconds()).toBeGreaterThan(0);
  });
});
