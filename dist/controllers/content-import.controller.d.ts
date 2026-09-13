import type { Request, Response, NextFunction } from 'express';
export declare function getImportSources(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getAccountMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function importAccountMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function previewUrl(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function importUrl(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function previewInstagramPublic(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function importInstagramPublic(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getImportJobById(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getImportJobsBatch(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function retryFailedImport(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=content-import.controller.d.ts.map