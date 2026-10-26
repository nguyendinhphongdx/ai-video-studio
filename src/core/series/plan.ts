// A new series starts as a proposal: the format is built from the channel's skill, the bible and roadmap come from the
// person (or the assistant), and everything is editable before the series is created (v1).
import type { PublishTemplate, SeriesBible } from '../domain/series';
import type { Skill } from '../skills/skill';
import type { ToolCatalog } from '../tools/catalog';

import type { EpisodeFormat, Slot } from './format';

export const MAX_ROADMAP = 60;

/** What a new series is made of before it exists: the format built from the skill, plus the bible and roadmap. */
export interface SeriesProposal {
  name: string;
  skillId: string;
  bible: SeriesBible;
  format: EpisodeFormat;
  publish: PublishTemplate;
  roadmap: { topic: string; goal: string }[];
}

const titleRef = 'remotion/title';
const outroRef = 'remotion/outro';
const recapRef = 'remotion/recap';
const quizRef = 'remotion/quiz';

/**
 * Starting episode format for a series that uses `skill`: locked intro and outro, a recap from episode 2
 * on, AI lesson scenes and (when the skill has the block) a quiz. The person edits it afterwards.
 */
export function defaultFormat(skill: Skill, tools: ToolCatalog, catchphrase = ''): EpisodeFormat {
  const allowed = tools.resolve(skill.tools).blocks.map((b) => b.ref);
  const has = (ref: string) => allowed.includes(ref);
  const content = allowed.filter((r) => ![titleRef, outroRef, recapRef, quizRef].includes(r));
  const lessonBlocks = content.length ? content : allowed;
  const slots: Slot[] = [];
  const base = { when: 'always' as const, blocks: [], guide: '' };

  if (has(titleRef)) {
    slots.push({
      ...base,
      id: 'intro',
      name: 'Mở đầu',
      fill: 'locked',
      scenes: { min: 1, max: 1 },
      locked: { block: titleRef, narration: `${catchphrase ? `${catchphrase.replace(/[.!?]+$/, '')}! ` : 'Chào các bạn! '}Tập {n}: {topic}!`, props: { title: 'Tập {n}: {topic}' } },
    });
  }
  const recapBlock = has(recapRef) ? recapRef : content.includes('remotion/cards') ? 'remotion/cards' : lessonBlocks[0];
  if (recapBlock) {
    slots.push({ ...base, id: 'recap', name: 'Ôn tập', fill: 'ai', when: 'not-first', blocks: [recapBlock], scenes: { min: 1, max: 1 }, guide: 'Nhắc lại ngắn gọn điều đã dạy ở tập trước, lấy từ bộ nhớ. Lời đọc có nối tiếp.' });
  }
  slots.push({ ...base, id: 'lesson', name: 'Bài học', fill: 'ai', blocks: lessonBlocks, scenes: { min: Math.max(1, skill.scenes.min - 2), max: Math.max(2, skill.scenes.max - 2) }, guide: 'Dạy đúng chủ đề và mục tiêu của tập, mỗi cảnh một ý.' });
  if (has(quizRef)) {
    slots.push({ ...base, id: 'quiz', name: 'Câu đố', fill: 'ai', blocks: [quizRef], scenes: { min: 1, max: 2 }, guide: 'Kiểm tra đúng điều vừa dạy trong phần Bài học.' });
  }
  if (has(outroRef)) {
    slots.push({ ...base, id: 'outro', name: 'Kết', fill: 'locked', scenes: { min: 1, max: 1 }, locked: { block: outroRef, narration: 'Hẹn gặp lại các bạn ở tập sau nhé! Nhớ đăng ký kênh nha!', props: {} } });
  }
  return { durationSec: null, slots };
}
