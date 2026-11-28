export interface LineDiff {
  added: string[];
  removed: string[];
}

/** Which non-empty lines appear only in `next` (added) or only in `prev` (removed). Order inside each list is the text order. */
export function lineDiff(prev: string, next: string): LineDiff {
  const lines = (t: string) => t.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  const a = lines(prev);
  const b = lines(next);
  const left = new Map<string, number>();
  for (const l of a) left.set(l, (left.get(l) ?? 0) + 1);
  const added: string[] = [];
  for (const l of b) {
    const n = left.get(l) ?? 0;
    if (n > 0) left.set(l, n - 1);
    else added.push(l);
  }
  const removed: string[] = [];
  for (const l of a) {
    const n = left.get(l) ?? 0;
    if (n > 0) {
      removed.push(l);
      left.set(l, n - 1);
    }
  }
  return { added, removed };
}
