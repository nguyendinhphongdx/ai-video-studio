import type { z } from 'zod';

import { ApiError } from './api-error';

export async function parseJsonBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  const body = await req.json().catch(() => ({}));
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError(400, 'validation_error', issue ? `${issue.path.join('.') || 'Dữ liệu'}: ${issue.message}` : 'Dữ liệu không hợp lệ.');
  }
  return result.data;
}
