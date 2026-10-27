export type UsageRange = 'today' | '7d' | '30d' | 'month' | 'all';

const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Start of a reporting range in the machine's local time (so "today" is the person's today), as an ISO instant. */
export function rangeStart(range: UsageRange, now = new Date()): string {
  const today = midnight(now);
  switch (range) {
    case 'today':
      return today.toISOString();
    case '7d':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6).toISOString();
    case '30d':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29).toISOString();
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case 'all':
      return new Date(0).toISOString();
  }
}

/** Start of a budget period: today or the 1st of this month. */
export const periodStart = (period: 'day' | 'month', now = new Date()): string => rangeStart(period === 'day' ? 'today' : 'month', now);
