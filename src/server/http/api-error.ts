/** Route Handlers throw this; `apiErrorResponse` turns it (or any error) into the wire shape the client parses. */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { UserFacingError } from '@/core/domain';
import { createLogger } from '@/server/logger';

const logger = createLogger('api');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new ApiError(404, 'not_found', `Không tìm thấy ${what}`);
export const conflict = (message: string) => new ApiError(409, 'conflict', message);

export function apiErrorResponse(err: unknown, path: string): NextResponse {
  const body = (status: number, code: string, message: string) =>
    NextResponse.json({ error: { code, message }, timestamp: new Date().toISOString(), path }, { status });
  if (err instanceof ApiError) {
    if (err.status >= 500) logger.error('API error', { status: err.status, code: err.code, path, error: err });
    return body(err.status, err.code, err.message);
  }
  if (err instanceof UserFacingError) {
    if (err.detail) logger.warn('User-facing error', { path, detail: err.detail });
    return body(422, 'unprocessable', err.message);
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    return body(400, 'validation_error', issue ? `${issue.path.join('.') || 'Dữ liệu'}: ${issue.message}` : 'Dữ liệu không hợp lệ');
  }
  logger.error('Unhandled API error', { path, error: err });
  return body(500, 'internal_error', 'Có lỗi xảy ra, vui lòng thử lại.');
}
