// "@remotion" names a whole tool; "@remotion/cards" one block. Front matter lists may omit the "@".
const MENTION_RE = /(?:^|[\s(,[])@([a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)?)/g;

export function mentionsIn(text: string): string[] {
  return [...new Set([...text.matchAll(MENTION_RE)].map((m) => m[1]!))];
}

export const normalizeRef = (ref: string) => ref.trim().replace(/^@/, '');
