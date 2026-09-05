import type { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    readonly message: string;
    readonly statusCode: number;
    readonly code: string;
    readonly details: Record<string, unknown>;
    constructor(message: string, statusCode?: number, code?: string, details?: Record<string, unknown>);
}
export declare function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=error-handler.d.ts.map