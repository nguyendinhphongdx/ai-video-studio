// Writing a video is three AI steps (plan, write to the plan, smooth the joins) on a throw-away database.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-story-test-${process.pid}`;
  return { calls: [] as { purpose: string; user: string; system: string }[], smooth: 'ok' as 'ok' | 'bad-count' | 'throws' };
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => true, generateObject: async () => ({ object: {}, model: 'x' }) } }));
vi.mock('@/server/adapters/image/image.service', () => ({ images: { isReady: async () => false, generate: async () => {} } }));
vi.mock('@/server/adapters/tts/tts.service', () => ({ tts: { synthesize: async () => 0 }, voiceAvailable: async () => false, ttsAvailable: async () => false, googleTtsAvailable: async () => false }));

import type { CoreDeps } from '@/core/ports';
import { writeScript } from '@/core/workflows/script';

import { publish } from '../fixtures';

type S = {
  channels: typeof import('@/server/modules/channel/channel.service');
  skills: typeof import('@/server/modules/skill/skill.service');
  episodes: typeof import('@/server/modules/episode/episode.service');
  deps: typeof import('@/server/core-deps');
};
let s: S;
let channelId: string;

const beat = (role: string, point: string) => ({ role, point, leaves: `sau ${point}` });
const scene = (n: number) => ({ block: 'remotion/picture', narration: `Cảnh ${n} gốc.`, props: { caption: `C${n}`, imagePrompt: `thing ${n}`, motion: 'auto' } });

function fakeLlm(): CoreDeps['llm'] {
  return {
    isReady: async () => true,
    chat: async () => ({ text: '', toolCalls: [], model: 'x' }),
    generateObject: async ({ system, user, purpose }) => {
      env.calls.push({ purpose: purpose ?? '', user, system });
      if (purpose === 'plan-story') return { model: 'x', object: { central: 'Vì sao biển sâu thế?', answer: 'Vì mảng kiến tạo.', stakes: 'Nó đổi cách ta hiểu Trái Đất.', thread: 'quả cầu thép', beats: [beat('hook', 'một'), beat('rise', 'hai'), beat('turn', 'ba'), beat('payoff', 'bốn')] } };
      if (purpose === 'smooth-narration') {
        if (env.smooth === 'throws') throw new Error('boom');
        const n = (user.match(/^\d+\. Cảnh/gm) ?? []).length;
        return { model: 'x', object: { lines: Array.from({ length: env.smooth === 'bad-count' ? 1 : n }, (_, i) => `Mượt ${i + 1}.`) } };
      }
      return { model: 'x', object: { title: 'Biển sâu', slots: { body: [scene(1), scene(2), scene(3), scene(4)] }, publish } };
    },
  };
}

beforeAll(async () => {
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  s = {
    channels: await import('@/server/modules/channel/channel.service'),
    skills: await import('@/server/modules/skill/skill.service'),
    episodes: await import('@/server/modules/episode/episode.service'),
    deps: await import('@/server/core-deps'),
  };
  channelId = (await s.channels.channelService.list())[0]!.id;
  await s.skills.skillService.install(channelId, 'picture-story');
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

async function newEpisode() {
  const made = await s.episodes.episodeService.create({ channelId, seriesId: null, skillId: 'picture-story', topic: 'Biển sâu', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
  return made.episode.id;
}

describe('writing a script in three steps', () => {
  it('plans first, writes to the plan, then smooths only the narration', async () => {
    env.calls.length = 0;
    env.smooth = 'ok';
    const id = await newEpisode();
    const deps = { ...s.deps.appDeps, llm: fakeLlm() } as CoreDeps;
    const e = await writeScript(deps, id, () => {});
    expect(env.calls.map((c) => c.purpose)).toEqual(['plan-story', 'write-episode', 'smooth-narration']);
    expect(env.calls[1]!.user).toContain('KHUNG MẠCH CHUYỆN');
    expect(env.calls[1]!.user).toContain('quả cầu thép');
    expect(env.calls[2]!.user).toContain('1. Cảnh 1 gốc.');
    const body = e.scenes.filter((x) => !x.locked);
    expect(body.map((x) => x.narration)).toEqual(['Mượt 1.', 'Mượt 2.', 'Mượt 3.', 'Mượt 4.']);
    expect(body.map((x) => x.props.imagePrompt)).toEqual(['thing 1', 'thing 2', 'thing 3', 'thing 4']);
  });

  it('keeps the written script when the smoothing pass fails or returns the wrong number of lines', async () => {
    for (const mode of ['bad-count', 'throws'] as const) {
      env.smooth = mode;
      const id = await newEpisode();
      const e = await writeScript({ ...s.deps.appDeps, llm: fakeLlm() } as CoreDeps, id, () => {});
      expect(e.scenes.filter((x) => !x.locked).map((x) => x.narration)).toEqual(['Cảnh 1 gốc.', 'Cảnh 2 gốc.', 'Cảnh 3 gốc.', 'Cảnh 4 gốc.']);
    }
  });
});
