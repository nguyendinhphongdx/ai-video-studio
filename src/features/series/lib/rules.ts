import type { EpisodeStatus } from '@/core/domain';
import type { EpisodeView } from '@/server/modules/episode/episode.types';

import type { SeriesRulesInput, SeriesView } from '../services/series.api';

export type Rules = SeriesRulesInput;

export const rulesOf = (s: SeriesView): Rules => ({ skillId: s.rules.skillId, bible: s.rules.bible, format: s.rules.format, publish: s.rules.publish });
export const sameRules = (a: Rules, b: Rules) => JSON.stringify(a) === JSON.stringify(b);

export type ColumnId = 'planned' | 'writing' | 'review' | 'producing' | 'done';

export const COLUMNS: { id: ColumnId; label: string; hint: string }[] = [
  { id: 'planned', label: 'Lộ trình', hint: 'Chưa viết kịch bản' },
  { id: 'writing', label: 'Đang viết', hint: 'AI hoặc bạn đang viết' },
  { id: 'review', label: 'Chờ duyệt', hint: 'Kịch bản hoặc video chờ bạn' },
  { id: 'producing', label: 'Đang sản xuất', hint: 'Lồng tiếng, dựng, kiểm tra' },
  { id: 'done', label: 'Xong', hint: 'Sẵn sàng đăng' },
];

const BY_STATUS: Record<EpisodeStatus, ColumnId> = { planned: 'planned', draft: 'writing', script_review: 'review', producing: 'producing', video_review: 'review', published: 'done' };

/** Which board column an episode sits in. A failed job always needs the person, so it goes to "Chờ duyệt". */
export function columnOf(v: EpisodeView): ColumnId {
  if (v.job?.state === 'failed') return 'review';
  return BY_STATUS[v.episode.status];
}

export const SAMPLE_VARS = { series: 'Bé học đếm', n: '5', topic: 'Số 5 và những ngôi sao', title: 'Số 5', channel: 'Kênh' };
