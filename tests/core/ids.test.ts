import { describe, expect, it } from 'vitest';

import { newId, slugify } from '@/core/domain/ids';

describe('ids', () => {
  it('slugifies plain words with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips Vietnamese diacritics', () => {
    expect(slugify('Tiếng Việt')).toBe('tieng-viet');
  });

  it('maps đ to d', () => {
    expect(slugify('Đường đi')).toBe('duong-di');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('  --Hi!--  ')).toBe('hi');
  });

  it('falls back to "video" when nothing usable is left', () => {
    expect(slugify('!!!')).toBe('video');
  });

  it('caps slugs at 40 characters', () => {
    expect(slugify('a'.repeat(100))).toHaveLength(40);
  });

  it('generates 12 character ids without dashes', () => {
    expect(newId()).toMatch(/^[0-9a-f]{12}$/);
  });

  it('generates distinct ids', () => {
    expect(newId()).not.toBe(newId());
  });
});
