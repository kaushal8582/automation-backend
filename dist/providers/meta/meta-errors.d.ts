import { type AxiosError } from 'axios';
import { AppError } from '../../middlewares/error-handler.js';
export type MetaGraphErrorBody = {
    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        fbtrace_id?: string;
    };
};
export declare function normalizeMetaError(error: unknown): AppError;
export declare function isAxiosError(error: unknown): error is AxiosError;
//# sourceMappingURL=meta-errors.d.ts.map