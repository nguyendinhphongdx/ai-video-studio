import type { UsageKind } from '@/core/usage/cost';

/** Money is stored in USD; small amounts need more digits to mean anything. */
export const fmtUsd = (usd: number | null | undefined): string => {
  if (usd === null || usd === undefined) return '—';
  if (usd === 0) return '$0';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd < 10 ? usd.toFixed(3) : usd.toFixed(2)}`.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
};
export const fmtVnd = (usd: number, fx: number): string => `${Math.round(usd * fx).toLocaleString('vi-VN')} ₫`;
export const fmtNum = (n: number): string => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString('vi-VN'));

export const KIND_LABEL: Record<UsageKind, string> = { llm: 'Văn bản (LLM)', image: 'Ảnh', tts: 'Giọng đọc' };
export const KIND_SHORT: Record<UsageKind, string> = { llm: 'LLM', image: 'Ảnh', tts: 'Giọng' };

export const PURPOSE_LABEL: Record<string, string> = {
  'plan-story': 'Dựng mạch chuyện',
  'write-episode': 'Viết kịch bản',
  'smooth-narration': 'Làm mượt lời đọc',
  'revise-episode': 'Sửa kịch bản',
  'summarize-episode': 'Ghi bộ nhớ tập',
  'rollup-season': 'Tóm tắt mùa',
  'suggest-topics': 'Gợi ý chủ đề',
  assistant: 'Trợ lý',
  scene_image: 'Ảnh cảnh',
  scene_voice: 'Giọng cảnh',
  channel_art: 'Ảnh nền kênh',
  tts_preview: 'Nghe thử giọng',
  test: 'Kiểm tra kết nối',
};
export const purposeLabel = (p: string): string => PURPOSE_LABEL[p] ?? (p || 'Khác');

export const RANGE_LABEL = { today: 'Hôm nay', '7d': '7 ngày', '30d': '30 ngày', month: 'Tháng này', all: 'Tất cả' } as const;
