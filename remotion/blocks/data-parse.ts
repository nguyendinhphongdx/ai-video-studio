// Text → data for the data scenes. Pure, shared by the scenes and their block definitions.
export interface TimelineItem {
  label: string;
  text: string;
}

/** "1969: First steps on the Moon" lines → milestones. Up to six. */
export function parseTimeline(data: string): TimelineItem[] {
  const out: TimelineItem[] = [];
  for (const line of data.split(/\r?\n/)) {
    const m = /^\s*(.{1,14}?)\s*[:=\-–—]\s*(.+?)\s*$/.exec(line);
    if (m) out.push({ label: m[1]!, text: m[2]!.slice(0, 70) });
  }
  return out.slice(0, 6);
}

/** "72", "1.250", "3,5" → number (Vietnamese thousands dots and decimal commas). */
export function parseNumber(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const thousands = /^\d{1,3}(\.\d{3})+$/.test(s);
  const n = Number(thousands ? s.replace(/\./g, '') : s.replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
