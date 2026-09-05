import type { Request, Response, NextFunction } from 'express';
export declare function listAccounts(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listInstagramAccountsHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function connectManualAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function removeAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function testPublishInstagram(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function instagramConnect(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function instagramCallback(req: Request, res: Response, _next: NextFunction): Promise<void>;
export declare function instagramExchange(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function facebookConnect(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function facebookCallback(req: Request, res: Response, _next: NextFunction): Promise<void>;
export declare function listFacebookAccountsHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function reconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=social.controller.d.ts.map