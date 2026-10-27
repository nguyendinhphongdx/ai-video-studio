// Per-scene work on a throw-away database: pictures, voices and approval gate production.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-scenes-test-${process.pid}`;
  return { imageReady: true, voiceReady: true, images: [] as string[], voices: [] as string[] };
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => true, generateObject: async () => ({ object: {}, model: 'x' }) } }));
vi.mock('@/server/adapters/image/image.service', () => ({ images: { isReady: async () => env.imageReady, generate: async () => {} } }));
vi.mock('@/server/adapters/tts/tts.service', () => ({
  tts: { synthesize: async () => 0 },
  voiceAvailable: async () => env.voiceReady,
  ttsAvailable: async () => env.voiceReady,
  googleTtsAvailable: async () => false,
}));

import type { Scene } from '@/core/domain';
import type { CoreDeps } from '@/core/ports';
import { generateSceneAssets } from '@/core/workflows/assets';
import { produce } from '@/core/workflows/produce';

type S = {
  channels: typeof import('@/server/modules/channel/channel.service');
  skills: typeof import('@/server/modules/skill/skill.service');
  episodes: typeof import('@/server/modules/episode/episode.service');
  repo: typeof import('@/server/modules/episode/episode.repository');
  jobs: typeof import('@/server/modules/job/job.repository');
  deps: typeof import('@/server/core-deps');
};
let s: S;
let channelId: string;

beforeAll(async () => {
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  s = {
    channels: await import('@/server/modules/channel/channel.service'),
    skills: await import('@/server/modules/skill/skill.service'),
    episodes: await import('@/server/modules/episode/episode.service'),
    repo: await import('@/server/modules/episode/episode.repository'),
    jobs: await import('@/server/modules/job/job.repository'),
    deps: await import('@/server/core-deps'),
  };
  channelId = (await s.channels.channelService.list())[0]!.id;
  await s.skills.skillService.install(channelId, 'picture-story');
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

const noAssets = { imagePath: null, imageHash: null, voicePath: null, voiceSeconds: null, voiceHash: null };
const pic = (id: string, prompt: string, narration = 'Lời đọc.'): Scene => ({ id, slotId: 'body', block: 'remotion/picture', locked: false, narration, props: { caption: 'Chú thích', imagePrompt: prompt, motion: 'auto' }, approved: false, assets: { ...noAssets } });

let counter = 0;
/** Scene ids are unique across the database, so each episode gets its own suffix; `ids` maps the short names used below. */
async function newEpisode(scenes: Scene[]) {
  const n = ++counter;
  const ids = Object.fromEntries(scenes.map((sc) => [sc.id, `${sc.id}${n}`])) as Record<string, string>;
  // Every video has the channel's own intro and outro as locked scenes (silent here, already approved).
  const locked = (slotId: string, block: string): Scene => ({ id: `${slotId}${n}`, slotId, block, locked: true, narration: '', props: {}, approved: true, assets: { ...noAssets } });
  scenes = [locked('intro', 'remotion/title'), ...scenes.map((sc) => ({ ...sc, id: ids[sc.id]! })), locked('outro', 'remotion/outro')];
  const made = await s.episodes.episodeService.create({ channelId, seriesId: null, skillId: 'picture-story', topic: 'Chủ đề thử', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
  const id = made.episode.id;
  s.repo.episodeRepository.update(id, { status: 'script_review', title: 'Thử', scenes });
  return { id, ids };
}

/** Deps whose paid providers write tiny files and count their calls. */
function fakeDeps(): CoreDeps {
  const calls = { images: env.images, voices: env.voices };
  return {
    ...s.deps.appDeps,
    images: { isReady: async () => env.imageReady, generate: async (prompt: string, file: string) => { calls.images.push(prompt); fs.mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true }); fs.writeFileSync(file, 'png'); } },
    tts: { synthesize: async (text: string, _v: string, file: string) => { calls.voices.push(text); fs.mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true }); fs.writeFileSync(file, 'mp3'); return 2.4; } },
  } as CoreDeps;
}

describe('scene pictures and voices', () => {
  it('makes only what is missing, per scene, and withdraws approval of what it remakes', async () => {
    env.images.length = 0;
    env.voices.length = 0;
    const { id, ids } = await newEpisode([pic('a', 'a market at dawn'), pic('b', 'a boat on the river')]);
    const deps = fakeDeps();
    expect(await generateSceneAssets(deps, id, { sceneIds: [ids.a!], image: true, voice: true }, () => {})).toEqual({ images: 1, voices: 1 });
    const after = (await s.episodes.episodeService.get(id)).episode.scenes.filter((x) => !x.locked);
    expect(after[0]!.assets.imagePath).toMatch(/images\/a\d+-/);
    expect(after[0]!.assets.voiceSeconds).toBe(2.4);
    expect(after[1]!.assets.imagePath).toBeNull();
    // Asking again for the same scene costs nothing: it is already fresh.
    expect(await generateSceneAssets(deps, id, { sceneIds: null, image: true, voice: true }, () => {})).toEqual({ images: 1, voices: 1 });
    expect(env.images).toHaveLength(2);
    expect(env.voices).toHaveLength(2);
    expect(await generateSceneAssets(deps, id, { sceneIds: null, image: true, voice: true }, () => {})).toEqual({ images: 0, voices: 0 });
  });

  it('"Tạo lại" makes a new, different picture even when the current one still matches the scene', async () => {
    env.images.length = 0;
    const { id, ids } = await newEpisode([pic('a', 'a market at dawn')]);
    const deps = fakeDeps();
    await generateSceneAssets(deps, id, { sceneIds: [ids.a!], image: true, voice: false }, () => {});
    const first = (await s.episodes.episodeService.get(id)).episode.scenes.find((x) => x.id === ids.a!)!.assets.imagePath;
    expect(await generateSceneAssets(deps, id, { sceneIds: [ids.a!], image: true, voice: false }, () => {})).toEqual({ images: 0, voices: 0 });
    expect(await generateSceneAssets(deps, id, { sceneIds: [ids.a!], image: true, voice: false, force: true }, () => {})).toEqual({ images: 1, voices: 0 });
    const again = (await s.episodes.episodeService.get(id)).episode.scenes.find((x) => x.id === ids.a!)!.assets.imagePath;
    expect(again).not.toBe(first);
    expect(env.images).toHaveLength(2);
    expect(env.images[1]).toContain(env.images[0]!);
    expect(env.images[1]).not.toBe(env.images[0]);
    expect((await s.episodes.episodeService.get(id)).assets[ids.a!]).toMatchObject({ ready: false, needsImage: true });
  });

  it('refuses to generate pictures without a configured provider', async () => {
    const { id } = await newEpisode([pic('a', 'a market')]);
    env.imageReady = false;
    await expect(generateSceneAssets(fakeDeps(), id, { sceneIds: null, image: true, voice: false }, () => {})).rejects.toThrow(/Chưa cài đặt tạo ảnh/);
    await expect(s.episodes.episodeService.requestAssets(id, { sceneIds: null, image: true, voice: false })).rejects.toThrow(/Chưa cài đặt tạo ảnh/);
    env.imageReady = true;
  });

  it('queues asset jobs only for real scenes and a usable voice', async () => {
    const { id, ids } = await newEpisode([pic('a', 'a market')]);
    await expect(s.episodes.episodeService.requestAssets(id, { sceneIds: ['nope'], image: true, voice: false })).rejects.toThrow(/không thuộc/);
    await expect(s.episodes.episodeService.requestAssets(id, { sceneIds: null, image: false, voice: false })).rejects.toThrow(/Chọn tạo ảnh/);
    env.voiceReady = false;
    await expect(s.episodes.episodeService.requestAssets(id, { sceneIds: null, image: false, voice: true })).rejects.toThrow(/Giọng đọc đang chọn/);
    env.voiceReady = true;
    const view = await s.episodes.episodeService.requestAssets(id, { sceneIds: [ids.a!], image: true, voice: true });
    expect(view.job).toMatchObject({ kind: 'scene_assets', state: 'queued', payload: { sceneIds: [ids.a!], image: true, voice: true } });
    await expect(s.episodes.episodeService.requestAssets(id, { sceneIds: null, image: true, voice: false })).rejects.toMatchObject({ status: 409 });
  });
});

describe('approval gate', () => {
  it('approves a scene only when its picture and voice exist, and refuses to produce until all are approved', async () => {
    const { id, ids } = await newEpisode([pic('a', 'a market'), pic('b', 'a boat')]);
    await expect(s.episodes.episodeService.setApproval(id, { sceneIds: [ids.a!], approved: true })).rejects.toMatchObject({ status: 409 });
    await generateSceneAssets(fakeDeps(), id, { sceneIds: null, image: true, voice: true }, () => {});
    let view = await s.episodes.episodeService.setApproval(id, { sceneIds: [ids.a!], approved: true });
    expect(view.episode.scenes.filter((x) => !x.locked).map((x) => x.approved)).toEqual([true, false]);
    expect(view.assets[ids.a!]).toMatchObject({ ready: true, needsImage: true, needsVoice: true });
    expect(view.assets[ids.a!]!.imageUrl).toMatch(/^\/api\/v1\/media\//);
    await expect(s.episodes.episodeService.approveScript(id)).rejects.toThrow(/Còn 1 cảnh chưa duyệt/);
    await expect(produce(fakeDeps(), id, () => {})).rejects.toThrow(/Còn 1 cảnh chưa duyệt/);
    view = await s.episodes.episodeService.setApproval(id, { sceneIds: null, approved: true });
    expect(view.episode.scenes.every((x) => x.approved)).toBe(true);
    expect((await s.episodes.episodeService.approveScript(id)).episode.status).toBe('producing');
  });

  it('keeps pictures and voices through an edit, but withdraws the approval and marks them stale when content changes', async () => {
    const { id, ids } = await newEpisode([pic('a', 'a market'), pic('b', 'a boat')]);
    await generateSceneAssets(fakeDeps(), id, { sceneIds: null, image: true, voice: true }, () => {});
    await s.episodes.episodeService.setApproval(id, { sceneIds: null, approved: true });
    const e = (await s.episodes.episodeService.get(id)).episode;
    // Edit only scene b's picture prompt; scene a is sent back unchanged.
    const input = {
      title: e.title,
      publish: e.publish,
      scenes: e.scenes.map((x) => (x.id === ids.b ? { ...x, props: { ...x.props, imagePrompt: 'a train station' } } : x)).map(({ id: sid, slotId, block, locked, narration, props }) => ({ id: sid, slotId, block, locked, narration, props })),
    };
    const view = await s.episodes.episodeService.saveScript(id, input);
    expect(view.episode.scenes.filter((x) => !x.locked).map((x) => x.approved)).toEqual([true, false]);
    expect(view.episode.scenes.filter((x) => !x.locked)[1]!.assets.imagePath).not.toBeNull();
    expect(view.assets[ids.b!]).toMatchObject({ imageUrl: null, imageStale: true, voiceStale: false, ready: false });
    expect(view.assets[ids.a!]!.ready).toBe(true);
    await expect(s.episodes.episodeService.setApproval(id, { sceneIds: [ids.b!], approved: true })).rejects.toThrow(/còn thiếu ảnh/);
  });

  it('lets the person withdraw approval, and refuses approvals once the script is approved', async () => {
    const { id, ids } = await newEpisode([pic('a', 'a market')]);
    await generateSceneAssets(fakeDeps(), id, { sceneIds: null, image: true, voice: true }, () => {});
    await s.episodes.episodeService.setApproval(id, { sceneIds: null, approved: true });
    expect((await s.episodes.episodeService.setApproval(id, { sceneIds: [ids.a!], approved: false })).episode.scenes.find((x) => x.id === ids.a)!.approved).toBe(false);
    await s.episodes.episodeService.setApproval(id, { sceneIds: null, approved: true });
    await s.episodes.episodeService.approveScript(id);
    await expect(s.episodes.episodeService.setApproval(id, { sceneIds: [ids.a!], approved: false })).rejects.toMatchObject({ status: 409 });
  });
});

describe('automatic generation', () => {
  it('stores the choice per video', async () => {
    const { id } = await newEpisode([pic('a', 'a market')]);
    const view = await s.episodes.episodeService.updateOptions(id, { autoImages: true, autoVoice: false });
    expect(view.episode).toMatchObject({ autoImages: true, autoVoice: false });
  });
});
