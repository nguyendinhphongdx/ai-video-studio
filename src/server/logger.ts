type Level = 'info' | 'warn' | 'error';

/** Minimal structured logger; details (stack traces, CLI output) go here, never to the UI. */
export function createLogger(scope: string) {
  const out = (level: Level, message: string, meta?: Record<string, unknown>) => {
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${scope}: ${message}`;
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    if (meta && Object.keys(meta).length) fn(line, meta);
    else fn(line);
  };
  return {
    info: (m: string, meta?: Record<string, unknown>) => out('info', m, meta),
    warn: (m: string, meta?: Record<string, unknown>) => out('warn', m, meta),
    error: (m: string, meta?: Record<string, unknown>) => out('error', m, meta),
  };
}
