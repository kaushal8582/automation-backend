import { getCurrentUser, loginUser, logoutSession, refreshSession, registerUser, } from '../services/auth.service.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies.js';
import { AUTH_COOKIES } from '../constants/auth.js';
export async function register(req, res, next) {
    try {
        const result = await registerUser(req.body);
        setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
        res.status(201).json({
            success: true,
            data: { user: result.user },
        });
    }
    catch (error) {
        next(error);
    }
}
export async function login(req, res, next) {
    try {
        const result = await loginUser(req.body);
        setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
        res.status(200).json({
            success: true,
            data: { user: result.user },
        });
    }
    catch (error) {
        next(error);
    }
}
export async function refresh(req, res, next) {
    try {
        const refreshToken = req.cookies?.[AUTH_COOKIES.refresh];
        if (!refreshToken) {
            clearAuthCookies(res);
            res.status(401).json({
                success: false,
                message: 'Refresh token missing',
                code: 'REFRESH_MISSING',
                details: {},
                requestId: req.requestId,
            });
            return;
        }
        const tokens = await refreshSession(refreshToken);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        res.status(200).json({
            success: true,
            data: { refreshed: true },
        });
    }
    catch (error) {
        clearAuthCookies(res);
        next(error);
    }
}
export async function logout(req, res, next) {
    try {
        const refreshToken = req.cookies?.[AUTH_COOKIES.refresh];
        await logoutSession(refreshToken);
        clearAuthCookies(res);
        res.status(200).json({
            success: true,
            data: { loggedOut: true },
        });
    }
    catch (error) {
        clearAuthCookies(res);
        next(error);
    }
}
export async function me(req, res, next) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'UNAUTHORIZED',
                details: {},
                requestId: req.requestId,
            });
            return;
        }
        const user = await getCurrentUser(req.user.id);
        res.status(200).json({
            success: true,
            data: { user },
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=auth.controller.js.map