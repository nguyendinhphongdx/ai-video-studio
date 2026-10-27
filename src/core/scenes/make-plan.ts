// What "do it all for me" would make for a video, and what it would cost against the budgets. Pure, so the screen
// and the assistant quote the same numbers.

export interface PlanScene {
  id: string;
  narration: string;
}
export interface PlanAssets {
  needsImage: boolean;
  imageUrl: string | null;
  needsVoice: boolean;
  voiceUrl: string | null;
  ready: boolean;
}

export interface MakePlan {
  images: number;
  voices: number;
  /** Narration of the scenes that still need a voice (the cost of a voice follows its length). */
  voiceTexts: string[];
  /** Scenes that are ready but not yet approved. */
  approvable: string[];
  /** Nothing to make. */
  empty: boolean;
}

export function makePlan(scenes: PlanScene[], assets: Record<string, PlanAssets | undefined>, approved: ReadonlySet<string> = new Set()): MakePlan {
  let images = 0;
  const voiceTexts: string[] = [];
  const approvable: string[] = [];
  for (const s of scenes) {
    const a = assets[s.id];
    if (a?.needsImage && !a.imageUrl) images++;
    if (a?.needsVoice && !a.voiceUrl && s.narration.trim()) voiceTexts.push(s.narration);
    if (a?.ready && !approved.has(s.id)) approvable.push(s.id);
  }
  return { images, voices: voiceTexts.length, voiceTexts, approvable, empty: images === 0 && voiceTexts.length === 0 };
}

export interface BudgetLike {
  scope: 'global' | 'channel';
  channelId: string | null;
  period: 'day' | 'month';
  limitUsd: number;
  spentUsd: number;
  mode: 'warn' | 'block';
  channelName?: string | null;
}

export interface BudgetWarning {
  level: 'warn' | 'block';
  text: string;
}

/** Budgets that this batch would push over their limit. A "block" budget stops the paid calls; a "warn" one only says so. */
export function budgetWarnings(estimateUsd: number | null, channelId: string, budgets: BudgetLike[]): BudgetWarning[] {
  const out: BudgetWarning[] = [];
  for (const b of budgets) {
    if (b.scope === 'channel' && b.channelId !== channelId) continue;
    const who = b.scope === 'global' ? 'toàn bộ' : `kênh ${b.channelName ?? ''}`.trim();
    const when = b.period === 'day' ? 'hôm nay' : 'tháng này';
    if (b.spentUsd >= b.limitUsd) out.push({ level: b.mode, text: `Ngân sách ${when} của ${who} đã dùng hết${b.mode === 'block' ? ': việc tạo ảnh/giọng sẽ bị chặn' : ''}.` });
    else if (estimateUsd !== null && b.spentUsd + estimateUsd > b.limitUsd) out.push({ level: b.mode, text: `Lần này sẽ vượt ngân sách ${when} của ${who} (đã dùng $${b.spentUsd.toFixed(2)} / $${b.limitUsd.toFixed(2)})${b.mode === 'block' ? ': phần vượt có thể bị chặn' : ''}.` });
  }
  return out;
}
