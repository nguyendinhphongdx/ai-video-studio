import { describe, expect, it } from 'vitest';

import { newId, slugify } from '@/core/domain/ids';

describe('ids', () => {
  it('slugifies plain words with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips Vietnamese diacritics', () => {
    expect(slugify('Tiếng Việt')).toBe('tieng-viet');
  });
});
