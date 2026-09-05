import { randomUUID } from 'node:crypto';
export function requestIdMiddleware(req, res, next) {
    const incoming = req.header('x-request-id');
    const requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
}
//# sourceMappingURL=request-id.js.map