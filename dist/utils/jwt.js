import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
export function signAccessToken(userId, email) {
    const payload = {
        sub: userId,
        email,
        type: 'access',
    };
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });
}
export function signRefreshToken(userId) {
    const jti = randomUUID();
    const payload = {
        sub: userId,
        type: 'refresh',
        jti,
    };
    const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });
    return { token, jti };
}
export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.type !== 'access') {
        throw new Error('Invalid access token type');
    }
    return decoded;
}
export function verifyRefreshToken(token) {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh' || !decoded.jti) {
        throw new Error('Invalid refresh token type');
    }
    return decoded;
}
export function getRefreshTokenTtlSeconds() {
    // Best-effort parse for Redis denylist TTL; default 7 days
    const raw = env.JWT_REFRESH_EXPIRES_IN;
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match)
        return 60 * 60 * 24 * 7;
    const value = Number(match[1]);
    const unit = match[2];
    switch (unit) {
        case 's':
            return value;
        case 'm':
            return value * 60;
        case 'h':
            return value * 60 * 60;
        case 'd':
            return value * 60 * 60 * 24;
        default:
            return 60 * 60 * 24 * 7;
    }
}
//# sourceMappingURL=jwt.js.map