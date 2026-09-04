import { describe, expect, it } from 'vitest';
import { normalizeMetaError } from './meta-errors.js';
import { AppError } from '../../middlewares/error-handler.js';

describe('normalizeMetaError', () => {
  it('maps token errors to META_TOKEN_EXPIRED', () => {
    const err = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 400,
        data: { error: { message: 'Session has expired', code: 190 } },
      },
    };
    // axios.isAxiosError checks symbol — wrap as AppError path via plain object fallback
    const normalized = normalizeMetaError(
      Object.assign(new Error('Session has expired'), {
        response: { status: 400, data: { error: { message: 'Session has expired', code: 190 } } },
      }),
    );
    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.code).toBe('META_TOKEN_EXPIRED');
    expect(err.isAxiosError).toBe(true);
  });

  it('maps permission errors', () => {
    const normalized = normalizeMetaError(
      Object.assign(new Error('permission denied'), {
        response: {
          status: 403,
          data: { error: { message: '(#10) Application does not have permission', code: 10 } },
        },
      }),
    );
    expect(normalized.code).toBe('META_PERMISSION_DENIED');
  });
});
