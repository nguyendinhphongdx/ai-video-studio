// The logo draft is found through its job's result, so the worker has to keep it.
import { describe, expect, it } from 'vitest';

import { keptResult } from '@/server/modules/job/job.repository';

describe('keptResult', () => {
  it('keeps what a drawing job made', () => {
    expect(keptResult('generate_art', { path: 'channels/x/logo-draft/a.png' })).toEqual({ path: 'channels/x/logo-draft/a.png' });
    expect(keptResult('generate_sprites', [1])).toEqual([1]);
  });

  it('drops the return value of jobs that change an episode', () => {
    expect(keptResult('produce', { id: 'e' })).toBeUndefined();
  });
});
