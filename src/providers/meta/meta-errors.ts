import axios, { type AxiosError } from 'axios';
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

export function normalizeMetaError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const axiosError = error as AxiosError<MetaGraphErrorBody>;
  const meta = axiosError.response?.data?.error;
  const message = meta?.message ?? axiosError.message ?? 'Meta API request failed';
  const code = meta?.code;
  const httpStatus = axiosError.response?.status;

  if (code === 190 || /session has expired|invalid oauth|token/i.test(message)) {
    return new AppError(message, 401, 'META_TOKEN_EXPIRED', {
      metaCode: code,
      subcode: meta?.error_subcode,
    });
  }

  if (code === 10 || code === 200 || /permission/i.test(message)) {
    return new AppError(message, 403, 'META_PERMISSION_DENIED', {
      metaCode: code,
      subcode: meta?.error_subcode,
    });
  }

  if (httpStatus === 429 || code === 4 || code === 17 || code === 32 || /rate limit/i.test(message)) {
    return new AppError(message, 429, 'META_RATE_LIMIT', {
      metaCode: code,
      subcode: meta?.error_subcode,
    });
  }

  if (/media|video|download|unsupported format/i.test(message)) {
    return new AppError(message, 400, 'META_INVALID_MEDIA', {
      metaCode: code,
      subcode: meta?.error_subcode,
    });
  }

  if (/processing/i.test(message)) {
    return new AppError(message, 502, 'META_MEDIA_PROCESSING_FAILED', {
      metaCode: code,
      subcode: meta?.error_subcode,
    });
  }

  if (httpStatus && httpStatus >= 500) {
    return new AppError(message, 502, 'META_ACCOUNT_UNAVAILABLE', {
      metaCode: code,
      subcode: meta?.error_subcode,
    });
  }

  return new AppError(message, httpStatus && httpStatus >= 400 ? httpStatus : 502, 'META_API_ERROR', {
    metaCode: code,
    subcode: meta?.error_subcode,
    type: meta?.type,
  });
}

export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}
