import type { Request, Response, NextFunction } from 'express';
export type AuthenticatedUser = {
    id: string;
    email: string;
};
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}
export declare function requireAuth(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map