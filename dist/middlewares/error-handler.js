export class AppError extends Error {
    message;
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
export function errorHandler(err, req, res, _next) {
    const requestId = req.requestId;
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
            details: err.details,
            requestId,
        });
        return;
    }
    console.error(`[${requestId}] Unhandled error`, err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: {},
        requestId,
    });
}
//# sourceMappingURL=error-handler.js.map