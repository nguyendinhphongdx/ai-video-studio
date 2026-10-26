import type { ContextInput } from '@/core/context/layer';
import type { Channel, Episode, SeriesVersion } from '@/core/domain';
import type { Skill } from '@/core/skills/skill';
import type { EpisodeFormat } from '@/core/series/format';
import { activeSlots } from '@/core/series/format';
import { slotBlocks } from '@/core/script/script';
import { toolCatalog } from '@/tools/registry';

export const channel: Channel = {
  id: 'c1', name: 'Kid Plazza', description: 'Kênh học cho bé', font: 'Baloo2', audience: 'trẻ 2-6 tuổi', style: 'vui vẻ', voice: 'vi-VN-HoaiMyNeural', outroText: 'Hẹn gặp lại!', subscribeText: 'ĐĂNG KÝ',
  hashtags: ['#kidplazza'], palette: ['#2F8BE6'], music: 'music.wav', logoPath: null, defaultSkillId: 'kids-cards', createdAt: '', updatedAt: '',
};

export const skill: Skill = { id: 'kids-cards', name: 'Thẻ màu', description: '', tools: ['remotion/title', 'remotion/cards', 'remotion/outro'], scenes: { min: 3, max: 6 }, body: 'Dùng @remotion/cards.' };

export const seriesFormat: EpisodeFormat = {
  durationSec: { min: 20, max: 120 },
  slots: [
    { id: 'intro', name: 'Mở đầu', fill: 'locked', when: 'always', blocks: [], scenes: { min: 1, max: 1 }, guide: '', locked: { block: 'remotion/title', narration: 'Chào các bé! Gà Bông đây. Tập {n}: {topic}!', props: { title: 'Tập {n}', look: 'sky' } } },
    { id: 'recap', name: 'Ôn tập', fill: 'ai', when: 'not-first', blocks: ['remotion/cards'], scenes: { min: 1, max: 1 }, guide: '' },
    { id: 'lesson', name: 'Bài học', fill: 'ai', when: 'always', blocks: ['remotion'], scenes: { min: 2, max: 4 }, guide: '' },
  ],
};

export const version: SeriesVersion = {
  seriesId: 's1', version: 2, skillId: 'kids-cards', format: seriesFormat, createdAt: '',
  bible: { premise: 'Gà Bông dạy đếm', instructions: 'Luôn vui vẻ.', host: 'Gà Bông', catchphrases: ['Gà Bông đây'], avoid: ['ma quỷ'], characterAssets: [] },
  publish: { title: '{series} | Tập {n}: {topic}', hashtags: ['#gabong'], descriptionFooter: 'Đăng ký kênh nhé' },
};

export function episode(over: Partial<Episode> = {}): Episode {
  return {
    id: 'e1', channelId: 'c1', seriesId: 's1', seriesVersion: null, number: 3, topic: 'Số 3', goal: 'Đếm đến 3', notes: '', skillId: 'kids-cards', status: 'draft',
    formats: ['landscape'], voice: 'vi-VN-HoaiMyNeural', music: true, sceneCount: null, title: '', scenes: [], publish: null, createdAt: '', updatedAt: '', ...over,
  };
}

export function context(over: Partial<ContextInput> = {}): ContextInput {
  const e = over.episode ?? episode();
  const slots = activeSlots(seriesFormat, e.number);
  return {
    channel, skill, format: seriesFormat, slots,
    blocks: slots.filter((s) => s.fill === 'ai').flatMap((s) => slotBlocks(s, toolCatalog)),
    series: { series: { id: 's1', channelId: 'c1', name: 'Bé học đếm', status: 'active', currentVersion: 2, createdAt: '', updatedAt: '' }, version },
    memory: { season: null, recent: [] }, episode: e, neighbours: { previousTopic: 'Số 2', nextTopic: 'Số 4' }, ...over,
  };
}

export const cardsScene = (heading: string) => ({ block: 'remotion/cards', narration: `Đây là ${heading}.`, props: { heading, emoji: '⭐', count: 3, caption: 'Ba ngôi sao', color: '#FF6B6B' } });
export const publish = { youtube: { title: 't', description: 'd', tags: [] }, facebook: { post: 'p' }, tiktok: { caption: 'c', hashtags: ['#x'] } };
