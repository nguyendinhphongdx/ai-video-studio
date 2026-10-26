// Skills and knowledge belong to a channel and live in SQLite; the market is files to install from.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-skills-test-${process.pid}`;
  return { ready: true };
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => env.ready, generateObject: async () => ({ object: {}, model: 'x' }) } }));

import { CONTEXT_LAYERS } from '@/core/context/providers';
import { compileContext } from '@/core/context/layer';
import type { CoreDeps } from '@/core/ports';
import { buildContext } from '@/core/workflows/context';
import { ChannelInput } from '@/server/modules/channel/channel.types';
import { toolCatalog } from '@/tools/registry';

import { context, episode } from '../fixtures';

type S = {
  channels: typeof import('@/server/modules/channel/channel.service');
  skills: typeof import('@/server/modules/skill/skill.service');
  market: typeof import('@/server/modules/skill/market.service');
  knowledge: typeof import('@/server/modules/knowledge/knowledge.service');
  episodes: typeof import('@/server/modules/episode/episode.service');
  jobs: typeof import('@/server/modules/job/job.repository');
};
let s: S;
let kid: string;

const input = (name: string) => ChannelInput.parse({ name, audience: 'x', style: 'y', voice: 'vi-VN-HoaiMyNeural', outroText: 'a', subscribeText: 'b', hashtags: [], music: 'none', palette: ['#112233'], defaultSkillId: null });

beforeAll(async () => {
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  s = {
    channels: await import('@/server/modules/channel/channel.service'),
    skills: await import('@/server/modules/skill/skill.service'),
    market: await import('@/server/modules/skill/market.service'),
    knowledge: await import('@/server/modules/knowledge/knowledge.service'),
    episodes: await import('@/server/modules/episode/episode.service'),
    jobs: await import('@/server/modules/job/job.repository'),
  };
  kid = (await s.channels.channelService.list())[0]!.id;
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

describe('market and channel-owned skills', () => {
  it('offers the market skills and marks the ones a channel already installed', async () => {
    const channel = await s.channels.channelService.create(input('Kênh A'));
    const before = await s.market.marketService.list(channel.id);
    expect(before.map((m) => m.id)).toEqual(expect.arrayContaining(['vox-style', 'picture-story', 'kids-cards']));
    expect(before.every((m) => m.installedAs === null)).toBe(true);
    await s.skills.skillService.install(channel.id, 'vox-style');
    expect((await s.market.marketService.list(channel.id)).find((m) => m.id === 'vox-style')?.installedAs).toBe('vox-style');
    expect((await s.market.marketService.list((await s.channels.channelService.create(input('Kênh B'))).id)).find((m) => m.id === 'vox-style')?.installedAs).toBeNull();
  });

  it('copies a skill into the channel: edits stay in that channel and never touch the market or other channels', async () => {
    const a = await s.channels.channelService.create(input('Kênh C'));
    const b = await s.channels.channelService.create(input('Kênh D'));
    const installed = await s.skills.skillService.install(a.id, 'picture-story');
    expect(installed.source).toBe('market:picture-story');
    await s.skills.skillService.save(a.id, 'picture-story', installed.markdown.replace('Kể chuyện bằng ảnh AI', 'Kể chuyện của kênh C'));
    expect((await s.skills.skillService.get(a.id, 'picture-story')).skill.name).toBe('Kể chuyện của kênh C');
    expect((await s.market.marketService.get('picture-story')).skill.name).toBe('Kể chuyện bằng ảnh AI');
    await expect(s.skills.skillService.get(b.id, 'picture-story')).rejects.toMatchObject({ status: 404 });
    // Installing twice keeps both copies under different ids.
    const second = await s.skills.skillService.install(a.id, 'picture-story');
    expect(second.skill.id).toBe('picture-story-2');
  });

  it('refuses a broken skill and keeps ids unique within a channel', async () => {
    const c = await s.channels.channelService.create(input('Kênh E'));
    await expect(s.skills.skillService.save(c.id, 'bad', 'không có phần khai báo', { create: true })).rejects.toMatchObject({ status: 400 });
    await expect(s.skills.skillService.save(c.id, 'tools', '---\nname: X\ntools: [nope/none]\n---\nbody text', { create: true })).rejects.toMatchObject({ status: 400 });
    const md = '---\nname: Của tôi\ndescription: d\ntools: [remotion/outro]\nscenes: 3-5\n---\n\nHướng dẫn.\n';
    expect((await s.skills.skillService.save(c.id, 'cua-toi', md, { create: true, source: 'ai' })).source).toBe('ai');
    await expect(s.skills.skillService.save(c.id, 'cua-toi', md, { create: true })).rejects.toMatchObject({ status: 409 });
  });

  it('adopts the shared skills that existing videos already use, once', async () => {
    // Kid Plazza was created before skills belonged to channels: its default skill must keep working.
    const channel = await s.channels.channelService.get(kid);
    expect(channel.defaultSkillId).toBe('kids-cards');
    const list = await s.skills.skillService.list(kid);
    expect(list.map((x) => x.id)).toEqual(['kids-cards']);
    expect(list[0]!.source).toBe('market:kids-cards');
    expect((await s.skills.skillService.list(kid)).map((x) => x.id)).toEqual(['kids-cards']);
  });

  it('will not delete a skill a video or the channel default still uses', async () => {
    const c = await s.channels.channelService.create(input('Kênh F'));
    const d = await s.skills.skillService.install(c.id, 'kids-cards');
    const made = await s.episodes.episodeService.create({ channelId: c.id, seriesId: null, skillId: d.skill.id, topic: 'Số hai', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
    await expect(s.skills.skillService.remove(c.id, d.skill.id)).rejects.toMatchObject({ status: 409 });
    await s.episodes.episodeService.remove(made.episode.id);
    await s.skills.skillService.remove(c.id, d.skill.id);
    expect(await s.skills.skillService.list(c.id)).toHaveLength(0);
  });

  it('only lets a video use a skill its own channel has', async () => {
    const a = await s.channels.channelService.create(input('Kênh G'));
    await expect(s.episodes.episodeService.create({ channelId: a.id, seriesId: null, skillId: 'vox-style', topic: 'Chủ đề', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true })).rejects.toMatchObject({ status: 404 });
  });
});

describe('channel knowledge', () => {
  it('writes immutable versions, ignores unchanged saves, and feeds the context', async () => {
    const c = await s.channels.channelService.create(input('Kênh H'));
    expect((await s.knowledge.knowledgeService.get(c.id)).current).toBeNull();
    const v1 = await s.knowledge.knowledgeService.save(c.id, '## Sự kiện\n- A', 'bản đầu');
    expect(v1.current).toMatchObject({ version: 1, note: 'bản đầu' });
    expect((await s.knowledge.knowledgeService.save(c.id, '## Sự kiện\n- A', '')).versions).toHaveLength(1);
    const v2 = await s.knowledge.knowledgeService.save(c.id, '## Sự kiện\n- A\n- B', 'thêm B');
    expect(v2.versions.map((v) => v.version)).toEqual([2, 1]);
    expect((await s.knowledge.knowledgeService.version(c.id, 1)).markdown).toBe('## Sự kiện\n- A');
    expect(await s.channels.channelStore.knowledge(c.id)).toEqual({ version: 2, markdown: '## Sự kiện\n- A\n- B' });
    expect(await s.channels.channelStore.knowledge((await s.channels.channelService.create(input('Kênh I'))).id)).toBeNull();
  });

  it('tells an episode when the knowledge changed after its script, and pins the version at write time', async () => {
    const c = await s.channels.channelService.create(input('Kênh J'));
    const d = await s.skills.skillService.install(c.id, 'picture-story');
    await s.knowledge.knowledgeService.save(c.id, 'Tri thức v1', '');
    const made = await s.episodes.episodeService.create({ channelId: c.id, seriesId: null, skillId: d.skill.id, topic: 'Một chủ đề', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
    expect(made.knowledge).toEqual({ used: null, current: 1 });
    s.jobs.jobRepository.claimNext();
    await s.knowledge.knowledgeService.save(c.id, 'Tri thức v2', '');
    expect((await s.episodes.episodeService.get(made.episode.id)).knowledge).toEqual({ used: null, current: 2 });
  });

  it('adds a knowledge layer right after the channel, and leaves it out when there is none', () => {
    const withKn = compileContext(CONTEXT_LAYERS, context({ knowledge: { version: 3, markdown: 'Jakarta lún 25 cm mỗi năm.' } }));
    expect(withKn.sections.map((x) => x.id).slice(0, 3)).toEqual(['system', 'channel', 'knowledge']);
    expect(withKn.text).toContain('phiên bản 3');
    expect(withKn.text).toContain('Jakarta lún 25 cm mỗi năm.');
    expect(compileContext(CONTEXT_LAYERS, context()).sections.map((x) => x.id)).not.toContain('knowledge');
  });

  it('loads knowledge and the channel skill into the episode context', async () => {
    const calls: string[][] = [];
    const deps = {
      channels: { get: async () => context().channel, knowledge: async () => ({ version: 4, markdown: 'K' }) },
      series: { get: async () => context().series!.series, version: async () => context().series!.version },
      skills: { get: async (channelId: string, id: string) => (calls.push([channelId, id]), context().skill) },
      memory: { season: async () => null, recent: async () => [] },
      episodes: { listInSeries: async () => [] },
      tools: toolCatalog,
    } as unknown as CoreDeps;
    const ctx = await buildContext(deps, episode());
    expect(ctx.knowledge).toEqual({ version: 4, markdown: 'K' });
    expect(calls).toEqual([['c1', 'kids-cards']]);
  });
});
