import type { Request, Response, NextFunction } from 'express';
export declare function presignMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function presignMediaBatch(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function completeMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deleteMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function bulkDeleteMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=media.controller.d.ts.map