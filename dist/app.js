import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { isAllowedFrontendOrigin } from './config/env.js';
import { API_PREFIX } from './constants/index.js';
import apiRoutes from './routes/index.js';
import { requestIdMiddleware } from './middlewares/request-id.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';
export function createApp() {
    const app = express();
    app.use(helmet());
    app.use(cors({
        origin(origin, callback) {
            // Non-browser clients (curl, health checks) send no Origin
            if (!origin) {
                callback(null, true);
                return;
            }
            if (isAllowedFrontendOrigin(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
    }));
    app.use(express.json({ limit: '1mb' }));
    app.use(cookieParser());
    app.use(requestIdMiddleware);
    app.use(API_PREFIX, apiRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map