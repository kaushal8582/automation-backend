import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, refresh, register, } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
const router = Router();
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many auth attempts. Try again later.',
        code: 'RATE_LIMITED',
        details: {},
    },
});
router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
export default router;
//# sourceMappingURL=auth.routes.js.map