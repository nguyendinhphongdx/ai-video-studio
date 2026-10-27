// Text → data for the software-window scene. Pure (no React), shared by the scene and its block definition.

/** Items one per line (2 to 6). */
export const uiItems = (raw: string): string[] => raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 6);

/** Which item the cursor goes to: a 1-based number or the item's own text; the last item when unclear. */
export function uiTarget(target: string, items: string[]): number {
  const n = Number(target.trim());
  if (Number.isInteger(n) && n >= 1 && n <= items.length) return n - 1;
  const at = items.findIndex((i) => i.toLowerCase() === target.trim().toLowerCase());
  return at >= 0 ? at : Math.max(0, items.length - 1);
}
