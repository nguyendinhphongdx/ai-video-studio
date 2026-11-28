// The assistant on a throw-away database: real services and tools, a scripted model.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-assistant-test-${process.pid}`;
  return { script: [] as { text?: string; calls?: { name: string; args: Record<string, unknown> }[]; before?: () => Promise<void> }[], systems: [] as string[], imageReady: true };
});
vi.mock('@/server/adapters/llm/llm.service', () => ({
  llm: {
    isReady: async () => true,
    generateObject: async () => ({ object: {}, model: 'x' }),
    chat: async ({ system, onDelta }: { system: string; onDelta?: (d: { type: 'text'; delta: string }) => void }) => {
      env.systems.push(system);
      const s = env.script.shift() ?? { text: 'hết kịch bản' };
      await s.before?.();
      if (s.text) onDelta?.({ type: 'text', delta: s.text });
      return { text: s.text ?? '', toolCalls: (s.calls ?? []).map((c, i) => ({ id: `c${Date.now()}${i}${Math.random()}`, ...c })), model: 'fake' };
    },
  },
}));
vi.mock('@/server/adapters/image/image.service', () => ({ images: { isReady: async () => env.imageReady, generate: async () => {} } }));

import type { SceneDesign } from '@/core/domain/design';

type S = {
  assistant: typeof import('@/server/modules/assistant/assistant.service');
  channels: typeof import('@/server/modules/channel/channel.service');
  skills: typeof import('@/server/modules/skill/skill.service');
  episodes: typeof import('@/server/modules/episode/episode.service');
  series: typeof import('@/server/modules/series/series.service');
  knowledge: typeof import('@/server/modules/knowledge/knowledge.service');
  jobs: typeof import('@/server/modules/job/job.repository');
  repo: typeof import('@/server/modules/episode/episode.repository');
};
let s: S;
let channelId: string;

beforeAll(async () => {
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  s = {
    assistant: await import('@/server/modules/assistant/assistant.service'),
    channels: await import('@/server/modules/channel/channel.service'),
    skills: await import('@/server/modules/skill/skill.service'),
    episodes: await import('@/server/modules/episode/episode.service'),
    series: await import('@/server/modules/series/series.service'),
    knowledge: await import('@/server/modules/knowledge/knowledge.service'),
    jobs: await import('@/server/modules/job/job.repository'),
    repo: await import('@/server/modules/episode/episode.repository'),
  };
  channelId = (await s.channels.channelService.list())[0]!.id;
  await s.skills.skillService.install(channelId, 'picture-story');
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

/** Run the queued assistant turn the way the worker would, and mark it done. */
async function work(threadId: string) {
  const job = await s.jobs.jobRepository.activeAssistant(threadId);
  if (!job) throw new Error('no turn queued');
  await s.assistant.assistantService.runTurn(threadId);
  await s.jobs.jobRepository.finish(job.id);
  return await s.assistant.assistantService.get(threadId);
}
const drainOthers = async () => {
  for (let c = await s.jobs.jobQueue.claimNext(); c; c = await s.jobs.jobQueue.claimNext()) await s.jobs.jobRepository.finish(c.job.id);
};
const say = async (threadId: string, text: string, focus = {}) => {
  await s.assistant.assistantService.send(threadId, text, focus);
  return await work(threadId);
};

const design = (text: string): SceneDesign => ({
  background: { mode: 'solid', colors: ['#102030'], angle: 0, texture: 'none', vignette: false },
  layers: [{ kind: 'text', anim: 'fade', delay: 0, land: { x: 50, y: 50, w: 80, h: 20 }, port: { x: 50, y: 50, w: 80, h: 20 }, text, size: 9, weight: '800', color: '#FFFFFF', font: 'brand', upper: false, spacing: 0, align: 'center' }],
  artPrompt: '',
  seconds: 4,
});

describe('conversation', () => {
  it('works through tools in auto mode, remembers everything, and titles the thread', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    env.script.push({ calls: [{ name: 'get_channel', args: {} }, { name: 'update_channel', args: { description: 'Giải thích lịch sử bằng đồ hoạ', palette: ['#112233', '#FFC53D'] } }] }, { text: 'Đã cập nhật mô tả và màu của kênh.' });
    const v = await say(t.thread.id, 'Kênh này nói về lịch sử, đổi mô tả và màu giúp mình', { route: `/channels/${channelId}` });
    expect(v.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'tool', 'assistant']);
    expect(v.messages.filter((m) => m.role === 'tool').map((m) => m.status)).toEqual(['done', 'done']);
    expect(v.thread.title).toMatch(/Kênh này nói về lịch sử/);
    const c = await s.channels.channelService.get(channelId);
    expect(c.description).toBe('Giải thích lịch sử bằng đồ hoạ');
    expect(c.palette).toEqual(['#112233', '#FFC53D']);
    expect(env.systems.at(-1)).toContain('Trang: /channels/');
    expect(env.systems.at(-1)).toContain('AUTO');
    expect(env.systems.at(-1)).toContain('picture-story');
  });

  it('saves a channel-owned design, normalised, and knowledge as a new version', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    env.script.push({ calls: [{ name: 'set_intro_design', args: { design: design('{title}') } }, { name: 'save_knowledge', args: { markdown: '## Kiến thức\n- Một điều', note: 'bản đầu' } }] }, { text: 'Xong.' });
    await say(t.thread.id, 'Thiết kế intro và ghi tri thức');
    const c = await s.channels.channelService.get(channelId);
    expect(c.introDesign?.layers[0]).toMatchObject({ kind: 'text', text: '{title}' });
    expect(c.outroDesign).toBeNull();
    expect((await s.knowledge.knowledgeService.get(channelId)).current).toMatchObject({ version: 1, note: 'bản đầu' });
  });

  it('feeds validation errors back to the model instead of failing the turn', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    env.script.push({ calls: [{ name: 'update_channel', args: { palette: [] } }] }, { calls: [{ name: 'update_channel', args: { hashtags: ['#a'] } }] }, { text: 'Đã sửa.' });
    const v = await say(t.thread.id, 'Đổi màu');
    expect(v.messages.filter((m) => m.role === 'tool').map((m) => m.status)).toEqual(['error', 'done']);
  });
});

describe('permission modes and approval', () => {
  it('asks before paid work in auto mode, runs it after approval, and lets the turn continue', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    env.script.push(
      { calls: [{ name: 'create_episode', args: { topic: 'Chợ nổi miền Tây', skillId: 'picture-story' } }] },
      { calls: [] },
    );
    let v = await say(t.thread.id, 'Tạo video về chợ nổi');
    const ep = (await s.episodes.episodeService.list({ channelId })).find((x) => x.episode.topic === 'Chợ nổi miền Tây')!;
    expect(ep.episode.status).toBe('planned');
    env.script.push({ calls: [{ name: 'write_script', args: { episodeId: ep.episode.id } }] }, { text: 'Đã giao viết kịch bản.' });
    v = await say(t.thread.id, 'Viết kịch bản đi');
    expect(v.awaiting).not.toBeNull();
    expect(v.messages.find((m) => m.status === 'awaiting')).toMatchObject({ toolName: 'write_script', summary: expect.stringContaining('AI viết kịch bản') });
    expect((await s.episodes.episodeService.get(ep.episode.id)).job).toBeNull();
    await s.assistant.assistantService.decide(t.thread.id, v.awaiting!, true);
    v = await work(t.thread.id);
    expect(v.awaiting).toBeNull();
    expect((await s.episodes.episodeService.get(ep.episode.id)).job).toMatchObject({ kind: 'write_script', state: 'queued' });
    expect(v.messages.at(-1)).toMatchObject({ role: 'assistant', content: 'Đã giao viết kịch bản.' });
    await drainOthers();
  });

  it('drops a pending request when the person writes something else, and refuses to overlap turns', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'ask');
    env.script.push({ calls: [{ name: 'update_channel', args: { description: 'khác' } }] });
    const v = await say(t.thread.id, 'Sửa mô tả');
    expect(v.awaiting).not.toBeNull();
    await s.assistant.assistantService.send(t.thread.id, 'Thôi, không sửa nữa', {});
    await expect(async () => s.assistant.assistantService.send(t.thread.id, 'gửi chồng', {})).rejects.toMatchObject({ status: 409 });
    env.script.push({ text: 'Ok, giữ nguyên.' });
    const after = await work(t.thread.id);
    expect(after.messages.find((m) => m.toolName === 'update_channel')).toMatchObject({ status: 'rejected' });
    expect((await s.channels.channelService.get(channelId)).description).not.toBe('khác');
  });

  it('changes the mode of a conversation', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    expect((await s.assistant.assistantService.setMode(t.thread.id, 'bypass')).thread.mode).toBe('bypass');
    await expect(async () => s.assistant.assistantService.setMode(t.thread.id, 'nope' as never)).rejects.toThrow();
  });

  it('never touches data of another channel', async () => {
    const other = await s.channels.channelService.create({ name: 'Kênh khác', description: '', font: 'Baloo2', imageStyle: '', introDesign: null, outroDesign: null, audience: 'x', style: 'y', voice: 'vi-VN-HoaiMyNeural', outroText: 'a', subscribeText: 'b', hashtags: [], music: 'none', palette: ['#112233'], defaultSkillId: null });
    await s.skills.skillService.install(other.id, 'picture-story');
    const foreign = await s.episodes.episodeService.create({ channelId: other.id, seriesId: null, skillId: 'picture-story', topic: 'Của kênh khác', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
    const t = await s.assistant.assistantService.create(channelId, 'bypass');
    env.script.push({ calls: [{ name: 'delete_episode', args: { episodeId: foreign.episode.id } }] }, { text: 'Không làm được.' });
    const v = await say(t.thread.id, 'Xoá video đó');
    expect(v.messages.find((m) => m.role === 'tool')).toMatchObject({ status: 'error', content: expect.stringContaining('không thuộc kênh') });
    expect((await s.episodes.episodeService.get(foreign.episode.id)).episode.topic).toBe('Của kênh khác');
  });
});

describe('scene and series tools', () => {
  const scene = (id: string, prompt: string, narration: string) => ({ id, slotId: 'body', block: 'remotion/picture', locked: false, narration, props: { caption: 'x', imagePrompt: prompt, motion: 'auto' }, approved: true, assets: { imagePath: 'p.png', imageHash: 'h', voicePath: 'v.mp3', voiceSeconds: 2, voiceHash: 'vh' } });

  it('edits one scene, keeps the others untouched, and withdraws only that approval', async () => {
    const made = await s.episodes.episodeService.create({ channelId, seriesId: null, skillId: 'picture-story', topic: 'Thử cảnh', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
    const id = made.episode.id;
    await s.repo.episodeRepository.update(id, { status: 'script_review', title: 'T', scenes: [scene('sa1', 'a market', 'Một.'), scene('sb1', 'a boat', 'Hai.')] });
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    env.script.push({ calls: [{ name: 'edit_scene', args: { episodeId: id, sceneId: 'sb1', narration: 'Hai, đã sửa.' } }] }, { text: 'Đã sửa cảnh 2.' });
    const v = await say(t.thread.id, 'Sửa lời đọc cảnh 2', { route: `/episodes/${id}`, episodeId: id, sceneId: 'sb1' });
    expect(v.messages.find((m) => m.role === 'tool')).toMatchObject({ status: 'done' });
    const after = (await s.episodes.episodeService.get(id)).episode.scenes.filter((x) => !x.locked);
    expect(after.map((x) => [x.narration, x.approved])).toEqual([['Một.', true], ['Hai, đã sửa.', false]]);
    expect(env.systems.at(-1)).toContain('Cảnh đang mở: cảnh 3'); // the channel intro is scene 1
  });

  it('quotes what is still missing before anything paid is asked for', async () => {
    const made = await s.episodes.episodeService.create({ channelId, seriesId: null, skillId: 'picture-story', topic: 'Báo giá', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
    const id = made.episode.id;
    const bare = { ...scene('sq1', 'a market', 'Một cảnh chưa có gì.'), approved: false, assets: { imagePath: null, imageHash: null, voicePath: null, voiceSeconds: null, voiceHash: null } };
    await s.repo.episodeRepository.update(id, { status: 'script_review', title: 'T', scenes: [bare] });
    const t = await s.assistant.assistantService.create(channelId, 'ask');
    env.script.push({ calls: [{ name: 'estimate_cost', args: { episodeId: id } }] }, { text: 'Ước tính xong.' });
    const v = await say(t.thread.id, 'Tạo hết ảnh và giọng giúp tôi', { episodeId: id });
    const tool = v.messages.find((m) => m.role === 'tool');
    expect(tool).toMatchObject({ status: 'done' }); // a read tool never waits for approval, even in ask mode
    expect(tool?.content).toMatch(/Còn thiếu 1 ảnh và \d+ giọng/);
  });

  it('changes the type of one scene to another block the skill allows, starting from that block\'s defaults', async () => {
    const made = await s.episodes.episodeService.create({ channelId, seriesId: null, skillId: 'picture-story', topic: 'Đổi loại cảnh', goal: '', notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
    const id = made.episode.id;
    await s.repo.episodeRepository.update(id, { status: 'script_review', title: 'T', scenes: [scene('sc1', 'a market', 'Một.'), scene('sd1', 'a boat', 'Hai.')] });
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    env.script.push({ calls: [{ name: 'edit_scene', args: { episodeId: id, sceneId: 'sd1', block: 'remotion/counter', props: { value: '25', unit: 'cm' } } }, { name: 'edit_scene', args: { episodeId: id, sceneId: 'sc1', block: 'remotion/nope' } }] }, { text: 'Xong.' });
    const v = await say(t.thread.id, 'Đổi cảnh 2 thành con số', { route: `/episodes/${id}`, episodeId: id, sceneId: 'sd1' });
    expect(v.messages.filter((m) => m.role === 'tool').map((m) => m.status)).toEqual(['done', 'error']);
    const after = (await s.episodes.episodeService.get(id)).episode.scenes.filter((x) => !x.locked);
    expect(after.map((x) => x.block)).toEqual(['remotion/picture', 'remotion/counter']);
    expect(after[1]!.props).toMatchObject({ value: '25', unit: 'cm', transition: 'auto' });
    expect(after[1]!.props).not.toHaveProperty('imagePrompt');
    expect(after[1]!.approved).toBe(false);
  });

  it('creates a series with its roadmap from the channel skill', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    env.script.push(
      { calls: [{ name: 'create_series', args: { name: 'Sông nước', skillId: 'picture-story', premise: 'Khám phá miền sông nước', host: 'Cô Tám', catchphrases: ['Chào nhà ơi'], avoid: [], instructions: 'Giọng ấm.', hashtags: ['#songnuoc'], roadmap: [{ topic: 'Chợ nổi', goal: 'Hiểu chợ nổi' }, { topic: 'Nhà bè', goal: '' }] } }] },
      { text: 'Đã lập series.' },
    );
    await say(t.thread.id, 'Lập series 2 tập về miền sông nước');
    const list = await s.series.seriesService.list(channelId);
    const made = list.find((x) => x.name === 'Sông nước')!;
    expect(made.stats.planned).toBe(2);
    expect(made.rules.bible).toMatchObject({ host: 'Cô Tám', catchphrases: ['Chào nhà ơi'] });
    expect(made.rules.format.slots.some((x) => x.fill === 'ai')).toBe(true);
  });
});

describe('live events and stop', () => {
  const eventsOf = async (threadId: string) => {
    const { assistantRepository } = await import('@/server/modules/assistant/assistant.repository');
    const { EventSchemas } = await import('@ag-ui/core/schemas');
    const rows = await assistantRepository.eventsAfter(threadId, 0);
    return rows.map((r) => EventSchemas.parse(JSON.parse(r.event)));
  };
  /** The stream a reconnecting screen reads, as text. */
  const read = async (threadId: string, after = 0) => await (await s.assistant.assistantService.events(threadId, after, new AbortController().signal)).text();

  it('keeps the turn as AG-UI events a screen can replay from any position', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    env.script.push({ calls: [{ name: 'get_channel', args: {} }] }, { text: 'Xem xong rồi.' });
    const v = await say(t.thread.id, 'Xem kênh');
    const types = (await eventsOf(t.thread.id)).map((e) => String(e.type));
    expect(types[0]).toBe('RUN_STARTED');
    expect(types.at(-1)).toBe('RUN_FINISHED');
    expect(types).toEqual(expect.arrayContaining(['TOOL_CALL_START', 'TOOL_CALL_RESULT', 'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END']));
    expect(v.messages.at(-1)?.data).toHaveProperty('liveId');
    const whole = await read(t.thread.id);
    expect(whole).toContain('RUN_STARTED');
    const first = Number(/^id: (\d+)$/m.exec(whole)![1]);
    const rest = await read(t.thread.id, first);
    expect(rest).not.toContain('RUN_STARTED');
    expect(rest).toContain('RUN_FINISHED');
  });

  it('ends a run waiting for approval as an interrupt', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'ask');
    env.script.push({ calls: [{ name: 'update_channel', args: { hashtags: ['#b'] } }] });
    const v = await say(t.thread.id, 'Đổi hashtag');
    expect((await eventsOf(t.thread.id)).at(-1)).toMatchObject({ type: 'RUN_FINISHED', outcome: { type: 'interrupt', interrupts: [{ id: String(v.awaiting), reason: 'approval' }] } });
  });

  it('stops: no further tool runs, the calls are answered, and the next message works', async () => {
    const t = await s.assistant.assistantService.create(channelId, 'auto');
    env.script.push({ text: 'Để mình đổi.', calls: [{ name: 'update_channel', args: { hashtags: ['#stopped'] } }], before: async () => void (await s.assistant.assistantService.stop(t.thread.id)) });
    const v = await say(t.thread.id, 'Đổi hashtag');
    expect(v.messages.map((m) => [m.role, m.status])).toEqual([['user', 'done'], ['assistant', 'done'], ['tool', 'rejected']]);
    expect((await s.channels.channelService.get(channelId)).hashtags).not.toContain('#stopped');
    expect((await eventsOf(t.thread.id)).at(-1)).toMatchObject({ type: 'RUN_FINISHED', outcome: { type: 'cancelled' } });
    env.script.push({ text: 'Vâng.' });
    const next = await say(t.thread.id, 'Thôi');
    expect(next.messages.at(-1)?.content).toBe('Vâng.');
    expect((await eventsOf(t.thread.id)).filter((e) => String(e.type) === 'RUN_STARTED')).toHaveLength(1);
  });
});
