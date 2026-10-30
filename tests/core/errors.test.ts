import { describe, expect, it } from 'vitest';

import { UserFacingError } from '@/core/domain/errors';

describe('UserFacingError', () => {
  it('carries the message and an optional detail for logs', () => {
    const e = new UserFacingError('Lỗi', 'stack info');
    expect(e.message).toBe('Lỗi');
    expect(e.detail).toBe('stack info');
  });
});
