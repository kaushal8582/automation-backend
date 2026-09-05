import { User } from '../models/user.model.js';
import { AppError } from '../middlewares/error-handler.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { getRefreshTokenTtlSeconds, signAccessToken, signRefreshToken, verifyRefreshToken, } from '../utils/jwt.js';
import { getRedis } from '../config/redis.js';
import { REFRESH_DENYLIST_PREFIX } from '../constants/auth.js';
async function isRefreshDenied(jti) {
    const result = await getRedis().get(`${REFRESH_DENYLIST_PREFIX}${jti}`);
    return result !== null;
}
async function denyRefreshToken(jti) {
    await getRedis().set(`${REFRESH_DENYLIST_PREFIX}${jti}`, '1', 'EX', getRefreshTokenTtlSeconds());
}
export async function registerUser(input) {
    const email = input.email.toLowerCase();
    const existing = await User.findOne({ email }).lean();
    if (existing) {
        throw new AppError('Email is already registered', 409, 'EMAIL_IN_USE');
    }
    const passwordHash = await hashPassword(input.password);
    const user = await User.create({
        name: input.name,
        email,
        passwordHash,
        timezone: input.timezone ?? 'UTC',
    });
    const accessToken = signAccessToken(user.id, user.email);
    const { token: refreshToken } = signRefreshToken(user.id);
    return {
        user: user.toPublic(),
        tokens: { accessToken, refreshToken },
    };
}
export async function loginUser(input) {
    const email = input.email.toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    const accessToken = signAccessToken(user.id, user.email);
    const { token: refreshToken } = signRefreshToken(user.id);
    return {
        user: user.toPublic(),
        tokens: { accessToken, refreshToken },
    };
}
export async function refreshSession(refreshToken) {
    let payload;
    try {
        payload = verifyRefreshToken(refreshToken);
    }
    catch {
        throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
    if (await isRefreshDenied(payload.jti)) {
        throw new AppError('Refresh token has been revoked', 401, 'REFRESH_REVOKED');
    }
    const user = await User.findById(payload.sub);
    if (!user) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }
    // Rotate: deny old refresh, issue new pair
    await denyRefreshToken(payload.jti);
    const accessToken = signAccessToken(user.id, user.email);
    const { token: nextRefresh } = signRefreshToken(user.id);
    return {
        accessToken,
        refreshToken: nextRefresh,
    };
}
export async function logoutSession(refreshToken) {
    if (!refreshToken)
        return;
    try {
        const payload = verifyRefreshToken(refreshToken);
        await denyRefreshToken(payload.jti);
    }
    catch {
        // Ignore invalid tokens on logout — cookies will still be cleared
    }
}
export async function getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user.toPublic();
}
//# sourceMappingURL=auth.service.js.map