import { AppError } from '../middlewares/error-handler.js';
export function validateBody(schema) {
    return (req, _res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
                issues: parsed.error.flatten(),
            }));
            return;
        }
        req.body = parsed.data;
        next();
    };
}
export function validateQuery(schema) {
    return (req, _res, next) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
                issues: parsed.error.flatten(),
            }));
            return;
        }
        req.query = parsed.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map