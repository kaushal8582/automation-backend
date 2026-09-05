import type { Request, Response, NextFunction } from 'express';
export declare function createPostHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listPostsHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getPostHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function cancelPostHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getPostMetricsHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function refreshPostMetricsHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function retryPostHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=post.controller.d.ts.map