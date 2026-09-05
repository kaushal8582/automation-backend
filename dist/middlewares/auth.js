import { AUTH_COOKIES } from '../constants/auth.js';
import { AppError } from './error-handler.js';
import { verifyAccessToken } from '../utils/jwt.js';
export function requireAuth(req, _res, next) {
    const token = req.cookies?.[AUTH_COOKIES.access];
    if (!token) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
    }
    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, email: payload.email };
        next();
    }
    catch {
        next(new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN'));
    }
}
//# sourceMappingURL=auth.js.map