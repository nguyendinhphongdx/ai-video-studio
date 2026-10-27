// Remotion starts and stops its static server on the fixed bundle port for every call. When one clip finishes and the
// next starts right away, the new call can land on the server that is still closing ("Visited ... but got no response").
// That is transient: waiting a moment and trying again works, so those errors are retried and everything else is not.
export const isTransientServerError = (e: unknown): boolean => /but got no response|ECONNREFUSED|ECONNRESET|EADDRINUSE|socket hang up|net::ERR_CONNECTION/i.test(String((e as Error)?.message ?? e));

export async function retryTransient<T>(fn: (attempt: number) => Promise<T>, opts: { attempts?: number; delayMs?: number; onRetry?: (e: unknown, attempt: number) => void } = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      if (attempt >= attempts || !isTransientServerError(e)) throw e;
      opts.onRetry?.(e, attempt);
      await new Promise((r) => setTimeout(r, (opts.delayMs ?? 1500) * attempt));
    }
  }
}
