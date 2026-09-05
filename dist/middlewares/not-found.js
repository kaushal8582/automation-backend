export function notFoundHandler(req, res, _next) {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        code: 'NOT_FOUND',
        details: {},
        requestId: req.requestId,
    });
}
//# sourceMappingURL=not-found.js.map