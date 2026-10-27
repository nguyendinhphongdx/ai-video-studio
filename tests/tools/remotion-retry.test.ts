import { describe, expect, it } from 'vitest';

import { isTransientServerError, retryTransient } from '@/tools/remotion/retry';

describe('retrying a render when the bundle server was not ready', () => {
  it('recognises the transient server errors and nothing else', () => {
    expect(isTransientServerError(new Error('Visited "http://localhost:3220/index.html" but got no response.'))).toBe(true);
    expect(isTransientServerError(new Error('connect ECONNREFUSED 127.0.0.1:3220'))).toBe(true);
    expect(isTransientServerError(new Error('Composition "SceneClip" not found'))).toBe(false);
  });

  it('retries a transient failure, gives up after the attempts, and never retries other errors', async () => {
    let calls = 0;
    const ok = await retryTransient(async () => (++calls < 3 ? Promise.reject(new Error('but got no response')) : 'done'), { delayMs: 1 });
    expect([ok, calls]).toEqual(['done', 3]);

    calls = 0;
    await expect(retryTransient(async () => (++calls, Promise.reject(new Error('but got no response'))), { attempts: 2, delayMs: 1 })).rejects.toThrow(/no response/);
    expect(calls).toBe(2);

    calls = 0;
    await expect(retryTransient(async () => (++calls, Promise.reject(new Error('bad props'))), { delayMs: 1 })).rejects.toThrow(/bad props/);
    expect(calls).toBe(1);
  });
});
