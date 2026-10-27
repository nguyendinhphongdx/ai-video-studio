// "Name: number" lines → bars. Shared by the chart scene and its block definition (pure, no React).
export interface ChartItem {
  label: string;
  value: number;
  /** The text as typed ("8.849"), shown on the bar. */
  shown: string;
}

/** Accepts "Everest: 8849", "Everest - 8.849", "Everest = 8,849 m"; Vietnamese thousands dots and decimal commas. */
export function parseChart(data: string): ChartItem[] {
  const items: ChartItem[] = [];
  for (const line of data.split(/\r?\n/)) {
    const m = /^\s*(.+?)\s*[:=\-–—]\s*([\d][\d.,]*)\s*\S*\s*$/.exec(line);
    if (!m) continue;
    const raw = m[2]!;
    // 1.234 / 1.234.567 are thousands separators; 12,5 and 3.5 are decimals.
    const thousands = /^\d{1,3}(\.\d{3})+$/.test(raw);
    const value = Number(thousands ? raw.replace(/\./g, '') : raw.replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
    if (Number.isFinite(value) && value >= 0) items.push({ label: m[1]!.slice(0, 28), value, shown: raw });
  }
  return items.slice(0, 6);
}
