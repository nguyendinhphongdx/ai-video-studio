import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

const ready = vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-channel-test-${process.pid}`;
  return { value: true, imageReady: true, generated: [] as string[] };
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => ready.value, generateObject: async () => ({ object: {}, model: 'x' }) } }));
vi.mock('@/server/adapters/image/image.service', () => ({
  images: {
    isReady: async () => ready.imageReady,
    generate: async (prompt: string, file: string) => {
      ready.generated.push(prompt);
      fs.writeFileSync(file, Buffer.from('89504e470d0a1a0a', 'hex'));
    },
  },
}));

import { DEFAULT_IMAGE_STYLE } from '@/core/domain/catalog';
import { fallbackDesign, normalizeDesign, SceneDesignSchema, type SceneDesign } from '@/core/domain/design';

import { ChannelInput } from '@/server/modules/channel/channel.types';

let svc: typeof import('@/server/modules/channel/channel.service');

beforeAll(async () => {
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  svc = await import('@/server/modules/channel/channel.service');
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

const input = (over: Partial<ChannelInput> = {}) => ChannelInput.parse({ name: 'Sử Việt', audience: 'người trẻ', style: 'ngắn gọn', voice: 'vi-VN-HoaiMyNeural', outroText: 'Hẹn gặp lại', subscribeText: 'ĐĂNG KÝ', hashtags: [], music: 'none', palette: ['#112233'], defaultSkillId: null, ...over });

const aiDesign = (text: string): SceneDesign => ({
  background: { mode: 'linear', colors: ['#112233', 'nope'], angle: 400, texture: 'grid', vignette: true },
  layers: [
    { kind: 'text', anim: 'slide-up', delay: 9, land: { x: 50, y: 50, w: 140, h: 20 }, port: { x: 50, y: 50, w: 80, h: 20 }, text, size: 99, weight: '800', color: 'red-ish', font: 'impact', upper: true, spacing: 50, align: 'center' },
    { kind: 'subscribe', anim: 'pop', delay: 0.5, land: { x: 50, y: 80, w: 30, h: 9 }, port: { x: 50, y: 80, w: 60, h: 7 }, fill: '#FFFFFF', color: 'bad', radius: 90 },
  ],
  artPrompt: ' a night skyline ',
  seconds: 99,
});

describe('channel-owned intro and outro', () => {
  it('starts without a design (fallback drawn) and keeps what the editor saves', async () => {
    expect(input().introDesign).toBeNull();
    await svc.channelService.list(); // first run seeds the shipped channels
    const created = await svc.channelService.create(input({ introDesign: aiDesign('{title}'), outroDesign: aiDesign('{outro}') }));
    const got = await svc.channelService.get(created.id);
    expect(got.introDesign?.layers).toHaveLength(2);
    const updated = await svc.channelService.update(created.id, input({ introDesign: null }));
    expect(updated.introDesign).toBeNull();
    expect(updated.outroDesign).toBeNull();
    expect((await svc.channelService.list()).find((c) => c.name === 'Kid Plazza')?.introDesign).toBeNull();
  });

  it('rejects a design the schema cannot draw', () => {
    expect(() => input({ introDesign: { ...aiDesign('x'), layers: [{ kind: 'sparkle' } as never] } })).toThrow();
    expect(SceneDesignSchema.safeParse(fallbackDesign('intro', ['#4F46E5'])).success).toBe(true);
    expect(SceneDesignSchema.safeParse(fallbackDesign('outro', [])).success).toBe(true);
  });

  it('normalises AI output into drawable values', () => {
    const d = normalizeDesign(aiDesign('Xin chào'), ['#112233', '#FFC53D']);
    expect(d.background).toMatchObject({ colors: ['#112233', '#112233'], angle: 360 });
    expect(d.seconds).toBe(7);
    expect(d.artPrompt).toBe('a night skyline');
    const [text, sub] = d.layers;
    expect(text).toMatchObject({ delay: 3, size: 40, spacing: 20, color: '#FFFFFF', land: { w: 100 } });
    expect(sub).toMatchObject({ color: '#111111', radius: 50 });
  });
});

describe('channel avatar and art', () => {
  it('stores an avatar, serves a URL for it, and removes it', async () => {
    const c = await svc.channelService.create(input());
    expect(c.avatarUrl).toBeNull();
    const png = new File([Buffer.from('89504e470d0a1a0a', 'hex')], 'a.png', { type: 'image/png' });
    expect((await svc.channelService.setAvatar(c.id, png)).avatarUrl).toMatch(/\/api\/v1\/media\/channels\/.+\/avatar\//);
    await expect(svc.channelService.setAvatar(c.id, new File(['x'], 'a.gif', { type: 'image/gif' }))).rejects.toMatchObject({ status: 400 });
    expect((await svc.channelService.removeAvatar(c.id)).avatarUrl).toBeNull();
  });

  it('makes background art in the channel image style and saves it on the channel', async () => {
    const c = await svc.channelService.create(input({ introDesign: aiDesign('{title}'), imageStyle: 'flat vector, pastel' }));
    ready.imageReady = false;
    await expect(svc.channelService.requestArt(c.id, 'intro', '')).rejects.toThrow(/Chưa cài đặt tạo ảnh/);
    ready.imageReady = true;
    await expect(svc.channelService.requestArt((await svc.channelService.create(input())).id, 'intro', '')).rejects.toThrow(/Chưa có mô tả ảnh nền/);
    const job = await svc.channelService.requestArt(c.id, 'intro', 'a night skyline with bokeh');
    expect(job).toMatchObject({ kind: 'generate_art', episodeId: null });
    const withArt = await svc.channelService.generateArt(c.id, 'intro', 'a night skyline with bokeh');
    expect(ready.generated.at(-1)).toBe('a night skyline with bokeh. flat vector, pastel');
    expect(withArt.introArtUrl).toMatch(/intro-art/);
    expect(withArt.outroArtUrl).toBeNull();
    const noStyle = await svc.channelService.create(input());
    await svc.channelService.generateArt(noStyle.id, 'outro', 'a calm sea');
    expect(ready.generated.at(-1)).toBe(`a calm sea. ${DEFAULT_IMAGE_STYLE}`);
    expect((await svc.channelService.removeArt(c.id, 'intro')).introArtUrl).toBeNull();
  });
});
