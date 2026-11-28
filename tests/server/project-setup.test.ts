// Project setup: an approved proposal becomes a channel with knowledge, skill, series and a planned library.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-setup-test-${process.pid}`;
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => true, generateObject: async () => ({ object: {}, model: 'x' }) } }));
vi.mock('@/server/adapters/image/image.service', () => ({ images: { isReady: async () => true, generate: async () => {} } }));

import { setupProblems, slugId } from '@/core/tasks/setup-project';

let service: typeof import('@/server/modules/setup/setup.service');

beforeAll(async () => {
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  service = await import('@/server/modules/setup/setup.service');
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

const input = {
  name: 'Truyện Na Tra',
  description: 'Hoạt hình cho bé',
  audience: 'trẻ em',
  style: 'kể chuyện ấm áp',
  voice: 'vi-VN-HoaiMyNeural' as const,
  imageStyle: '2D cartoon',
  palette: ['#112233'],
  outroText: 'Hẹn gặp lại',
  hashtags: ['#natra'],
  knowledge: '# Na Tra\nCon trai Lý Tịnh.',
  skillId: 'picture-story',
  series: {
    name: 'Phong thần nhí',
    premise: 'Chuyện Na Tra',
    instructions: 'Kể theo thứ tự',
    avoid: ['máu me'],
    cast: [
      { id: 'na-tra', kind: 'hero' as const, name: 'Na Tra', description: 'a boy with two hair buns' },
      { id: 'ly-tinh', kind: 'character' as const, name: 'Lý Tịnh', description: 'a stern general in armour' },
    ],
    roadmap: [{ topic: 'Ra đời', goal: '' }],
  },
  logoPrompt: 'a lotus',
  introArtPrompt: 'a lotus pond',
};

describe('project setup', () => {
  it('creates every part of the project from the approved proposal', async () => {
    const channel = await service.setupService.apply(input);
    expect(channel.defaultSkillId).toBeTruthy();
    expect(channel.imageStyle).toBe('2D cartoon');
    const { knowledgeService } = await import('@/server/modules/knowledge/knowledge.service');
    expect((await knowledgeService.get(channel.id)).current?.markdown).toContain('Lý Tịnh');
    const { seriesService } = await import('@/server/modules/series/series.service');
    const [series] = await seriesService.list(channel.id);
    const bible = series!.rules.bible;
    expect(service.missingLibrary(bible).map((i) => i.id)).toEqual(['na-tra', 'ly-tinh']);
    expect(bible.brandIdeas?.introArt).toBe('a lotus pond');
    // A second click while the drawing is queued must not queue (and pay for) it again.
    const first = await service.setupService.requestLibrary(series!.id);
    expect((await service.setupService.requestLibrary(series!.id)).id).toBe(first.id);
  });

  it('names what a thin proposal still lacks', () => {
    expect(setupProblems({ ...input, series: { ...input.series, cast: [] } }).length).toBeGreaterThan(2);
    expect(slugId('Lý Tịnh Đại Tướng')).toBe('ly-tinh-dai-tuong');
  });
});
