// Integration test on a throw-away SQLite database: series lifecycle through the real services and repositories.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

const ready = vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-series-test-${process.pid}`;
  return { value: false };
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => ready.value, generateObject: async () => ({ object: {}, model: 'x' }) } }));

type Services = {
  channel: typeof import('@/server/modules/channel/channel.service');
  series: typeof import('@/server/modules/series/series.service');
  episode: typeof import('@/server/modules/episode/episode.service');
  episodeRepo: typeof import('@/server/modules/episode/episode.repository');
  jobs: typeof import('@/server/modules/job/job.repository');
  memory: typeof import('@/server/modules/memory/memory.repository');
};
let s: Services;
let channelId: string;

beforeAll(async () => {
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  s = {
    channel: await import('@/server/modules/channel/channel.service'),
    series: await import('@/server/modules/series/series.service'),
    episode: await import('@/server/modules/episode/episode.service'),
    episodeRepo: await import('@/server/modules/episode/episode.repository'),
    jobs: await import('@/server/modules/job/job.repository'),
    memory: await import('@/server/modules/memory/memory.repository'),
  };
  channelId = (await s.channel.channelService.list())[0]!.id;
  const skills = await import('@/server/modules/skill/skill.service');
  for (const id of ['kids-series', 'vox-style', 'kids-cards']) await skills.skillService.install(channelId, id);
  return () => fs.rmSync(path.resolve(process.env.AVS_DATA_DIR!), { recursive: true, force: true });
});

const roadmap = [
  { topic: 'Số 1 và chú gà', goal: 'Nhận biết số 1' },
  { topic: 'Số 2 và đôi tay', goal: '' },
  { topic: 'Số 3 và ba ngôi sao', goal: 'Đếm đến 3' },
];

async function newSeries(name: string) {
  const tpl = await s.series.seriesService.template(channelId, 'kids-series');
  return s.series.seriesService.create({ channelId, name, skillId: tpl.skillId, bible: { ...tpl.bible, premise: 'Gà Bông đếm số', catchphrases: ['Gà Bông đây'] }, format: tpl.format, publish: tpl.publish, roadmap });
}

describe('series service', () => {
  it('uses a temporary database', () => {
    expect(path.resolve(process.env.AVS_DATA_DIR!).startsWith(os.tmpdir()) || process.env.AVS_DATA_DIR!.includes('avs-series-test')).toBe(true);
  });

  it('builds a valid blank template from a skill', async () => {
    const tpl = await s.series.seriesService.template(channelId, 'kids-series');
    expect(tpl.format.slots.map((x) => x.id)).toEqual(['intro', 'recap', 'lesson', 'quiz', 'outro']);
    expect(tpl.roadmap).toEqual([]);
  });

  it('creates v1 with the roadmap as planned episodes numbered 1..n', async () => {
    const created = await newSeries('Bé học đếm');
    expect(created.currentVersion).toBe(1);
    expect(created.stats).toMatchObject({ planned: 3, total: 3, published: 0 });
    const eps = s.episodeRepo.episodeRepository.list({ seriesId: created.id });
    expect(eps.map((e) => [e.number, e.topic, e.status])).toEqual([[1, 'Số 1 và chú gà', 'planned'], [2, 'Số 2 và đôi tay', 'planned'], [3, 'Số 3 và ba ngôi sao', 'planned']]);
    expect((await s.series.seriesService.list(channelId)).find((x) => x.id === created.id)?.stats.total).toBe(3);
  });

  it('reorders planned episodes among their own numbers and refuses started ones', async () => {
    const created = await newSeries('Thứ tự');
    const [a, b, c] = s.episodeRepo.episodeRepository.list({ seriesId: created.id });
    await s.series.seriesService.reorder(created.id, [c!.id, a!.id, b!.id]);
    const after = s.episodeRepo.episodeRepository.list({ seriesId: created.id });
    expect(after.map((e) => e.id)).toEqual([c!.id, a!.id, b!.id]);
    expect(after.map((e) => e.number)).toEqual([1, 2, 3]);
    s.episodeRepo.episodeRepository.update(a!.id, { status: 'script_review' });
    await expect(s.series.seriesService.reorder(created.id, [a!.id, b!.id])).rejects.toMatchObject({ status: 409 });
    // A subset keeps the numbers of the others untouched.
    await s.series.seriesService.reorder(created.id, [b!.id, c!.id]);
    expect(s.episodeRepo.episodeRepository.list({ seriesId: created.id }).map((e) => [e.id === a!.id ? 'a' : e.id === b!.id ? 'b' : 'c', e.number])).toEqual([['b', 1], ['a', 2], ['c', 3]]);
  });

  it('never mutates a saved version: saving rules creates the next one', async () => {
    const created = await newSeries('Phiên bản');
    const v1 = created.rules;
    const next = await s.series.seriesService.saveRules(created.id, { skillId: v1.skillId, bible: { ...v1.bible, premise: 'Đã sửa' }, format: v1.format, publish: v1.publish });
    expect(next.currentVersion).toBe(2);
    expect(next.rules.bible.premise).toBe('Đã sửa');
    const versions = await s.series.seriesService.versions(created.id);
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
    expect(versions[1]!.bible.premise).toBe('Gà Bông đếm số');
    await expect(s.series.seriesService.saveRules(created.id, { skillId: v1.skillId, bible: v1.bible, format: { ...v1.format, slots: [{ ...v1.format.slots[2]!, blocks: [] }] }, publish: v1.publish })).rejects.toMatchObject({ status: 400 });
  });

  it('exports and imports a series with its roadmap', async () => {
    const created = await newSeries('Xuất nhập');
    const file = await s.series.seriesService.exportFile(created.id);
    expect(file.roadmap).toHaveLength(3);
    const copy = await s.series.seriesService.importFile(channelId, file);
    expect(copy.id).not.toBe(created.id);
    expect(copy.stats.planned).toBe(3);
  });

  it('edits the brief of planned episodes only until the script is approved', async () => {
    const created = await newSeries('Sửa tập');
    const [a] = s.episodeRepo.episodeRepository.list({ seriesId: created.id });
    const v = await s.episode.episodeService.updateOptions(a!.id, { topic: 'Số 1 và ba chú gà', goal: 'Mới' });
    expect(v.episode).toMatchObject({ topic: 'Số 1 và ba chú gà', goal: 'Mới' });
    s.episodeRepo.episodeRepository.update(a!.id, { status: 'producing' });
    await expect(s.episode.episodeService.updateOptions(a!.id, { topic: 'Không được' })).rejects.toMatchObject({ status: 409 });
  });

  it('queues scripts for several planned episodes, oldest first, once', async () => {
    const created = await newSeries('Viết hàng loạt');
    const eps = s.episodeRepo.episodeRepository.list({ seriesId: created.id });
    ready.value = false;
    await expect(s.episode.episodeService.requestScripts(created.id, [eps[0]!.id])).rejects.toThrow(/Chưa cài đặt AI/);
    ready.value = true;
    const views = await s.episode.episodeService.requestScripts(created.id, [eps[2]!.id, eps[0]!.id]);
    expect(views.map((v) => v.episode.number)).toEqual([1, 3]);
    expect(views.every((v) => v.episode.status === 'draft' && v.job?.kind === 'write_script')).toBe(true);
    await expect(s.episode.episodeService.requestScripts(created.id, [eps[0]!.id])).rejects.toMatchObject({ status: 409 });
    const claimed = [s.jobs.jobRepository.claimNext(), s.jobs.jobRepository.claimNext()].map((j) => j?.episodeId);
    expect(claimed).toEqual([eps[0]!.id, eps[2]!.id]);
  });

  it('keeps series memory editable without touching other data', async () => {
    const created = await newSeries('Bộ nhớ');
    const [a] = s.episodeRepo.episodeRepository.list({ seriesId: created.id });
    await s.memory.memoryStore.save({ episodeId: a!.id, seriesId: created.id, number: 1, title: 'Số 1', summary: 'Dạy số 1', concepts: ['số 1'], examples: ['gà'], vocabulary: [], jokes: [], createdAt: new Date().toISOString() });
    const patched = await s.series.seriesService.saveEpisodeMemory(created.id, a!.id, { summary: 'Dạy số 1 bằng gà con', concepts: ['số 1', 'đếm'], examples: ['gà'], vocabulary: ['một'], jokes: [] });
    expect(patched.episodes[0]).toMatchObject({ summary: 'Dạy số 1 bằng gà con', concepts: ['số 1', 'đếm'], vocabulary: ['một'] });
    expect((await s.series.seriesService.saveSeason(created.id, 'Cả mùa đếm số')).season).toBe('Cả mùa đếm số');
    await expect(s.series.seriesService.saveEpisodeMemory(created.id, 'nope', { summary: '', concepts: [], examples: [], vocabulary: [], jokes: [] })).rejects.toMatchObject({ status: 404 });
  });

  it('switches a one-off video to another skill: scenes cleared, written again; series videos and approved scripts refuse', async () => {
    ready.value = true;
    const created = await s.episode.episodeService.create({ channelId, seriesId: null, skillId: 'kids-cards', topic: 'Tam giác Bermuda', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: false });
    const id = created.episode.id;
    jobsDrain(id);
    s.episodeRepo.episodeRepository.update(id, { title: 'Cũ', status: 'script_review', scenes: [{ id: 'x1', slotId: 'body', block: 'remotion/cards', locked: false, narration: 'Cũ', props: {}, approved: false, assets: { imagePath: null, imageHash: null, voicePath: null, voiceSeconds: null, voiceHash: null } }] });
    const view = await s.episode.episodeService.updateOptions(id, { skillId: 'vox-style' });
    expect(view.episode).toMatchObject({ skillId: 'vox-style', status: 'draft', title: '', scenes: [], topic: 'Tam giác Bermuda' });
    expect(view.job).toMatchObject({ kind: 'write_script', state: 'queued' });
    jobsDrain(id);
    s.episodeRepo.episodeRepository.update(id, { status: 'producing' });
    await expect(s.episode.episodeService.updateOptions(id, { skillId: 'kids-cards' })).rejects.toMatchObject({ status: 409 });
    const inSeries = (await s.episodeRepo.episodeRepository.list({ seriesId: (await newSeries('Đổi skill')).id }))[0]!;
    await expect(s.episode.episodeService.updateOptions(inSeries.id, { skillId: 'kids-cards' })).rejects.toMatchObject({ status: 409 });
  });
});

function jobsDrain(episodeId: string) {
  // finish whatever is queued for the episode so the next action is not blocked by "đang có việc chạy"
  const j = s.jobs.jobRepository.active(episodeId);
  if (j) s.jobs.jobRepository.finish(j.id);
}
