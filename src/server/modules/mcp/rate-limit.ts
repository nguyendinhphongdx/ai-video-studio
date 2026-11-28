/** Calls a code may make in one minute. Kept in memory, so it starts again with the server. */
export const PER_MINUTE = 120;

const seen = new Map<string, number[]>();

export function allowed(codeId: string, now = Date.now()): boolean {
  const recent = (seen.get(codeId) ?? []).filter((t) => t > now - 60_000);
  const ok = recent.length < PER_MINUTE;
  if (ok) recent.push(now);
  seen.set(codeId, recent);
  return ok;
}
