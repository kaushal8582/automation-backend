import { getHealthStatus } from '../services/health.service.js';
export async function healthCheck(_req, res, next) {
    try {
        const health = await getHealthStatus();
        const statusCode = health.success ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=health.controller.js.map