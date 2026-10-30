import { describe, expect, it } from 'vitest';

import { UserFacingError } from '@/core/domain/errors';

describe('UserFacingError', () => {
  it('carries the message and an optional detail for logs', () => {
    const e = new UserFacingError('Lỗi', 'stack info');
    expect(e.message).toBe('Lỗi');
    expect(e.detail).toBe('stack info');
  });

  it('is an Error and has no detail by default', () => {
    const e = new UserFacingError('Lỗi');
    expect(e).toBeInstanceOf(Error);
    expect(e.detail).toBeUndefined();
  });

  it('can be told apart from plain errors', () => {
    expect(new Error('x') instanceof UserFacingError).toBe(false);
  });
});
