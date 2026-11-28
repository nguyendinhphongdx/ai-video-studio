import { fold } from '@/core/text';

export { fold };

/** Every word of the query appears somewhere in the text (order does not matter). */
export function matchesQuery(text: string, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fold(text);
  return words.every((w) => hay.includes(w));
}

/** Compare two sort values: numbers numerically, text naturally in Vietnamese; empty values are handled by the table (last). */
export function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' });
}
