import { describe, expect, it } from 'vitest';

import { DEFAULT_IMAGE_STYLE } from '@/core/domain/catalog';
import type { Scene } from '@/core/domain/episode';
import { orderSteps } from '@/core/pipeline/step';
import { PRODUCTION_STEPS } from '@/core/pipeline/steps';
import { imagesStep } from '@/core/pipeline/steps/images';
import { renderStep } from '@/core/pipeline/steps/render';
import { voiceStep } from '@/core/pipeline/steps/voice';
import type { ProductionContext } from '@/core/pipeline/production';
import type { CoreDeps } from '@/core/ports';
import { carryOver, imageSpec, readiness, voiceHashOf } from '@/core/scenes/assets';
import { cleanProps } from '@/core/tools/tool';
import { toolCatalog } from '@/tools/registry';
import { VOX_IMAGE_STYLE } from '@/tools/remotion/blocks/vox';
import { autoMotion, cardsLayoutFor, cornerFor, labelStyleFor, skyPatternFor } from '@video/blocks/variants';

import { channel, episode, noAssets } from '../fixtures';

const scene = (id: string, block: string, props: Record<string, unknown>, over: Partial<Scene> = {}): Scene => ({ id, slotId: 'body', block, locked: false, narration: 'Một câu.', props, approved: false, assets: { ...noAssets }, ...over });
const vox = (id: string, imagePrompt: string, over: Partial<Scene> = {}) => scene(id, 'remotion/vox', { label: 'BOEING 777', imagePrompt, motion: 'auto' }, over);
const picture = (id: string, over: Partial<Scene> = {}) => scene(id, 'remotion/picture', { caption: 'Hà Nội', imagePrompt: 'a street food vendor at night, medium shot', motion: 'auto' }, over);
const cards = scene('c', 'remotion/cards', { heading: '1', emoji: '⭐', count: 1, caption: 'x', color: '#FF0000' });

const withImage = (s: Scene, style = ''): Scene => {
  const spec = imageSpec(s, toolCatalog, style)!;
  return { ...s, assets: { ...s.assets, imagePath: `episodes/e1/images/${s.id}-${spec.hash}.png`, imageHash: spec.hash } };
};
const withVoice = (s: Scene, voice = 'vi-VN-HoaiMyNeural'): Scene => ({ ...s, assets: { ...s.assets, voicePath: `episodes/e1/voice/${s.id}.mp3`, voiceSeconds: 2.5, voiceHash: voiceHashOf(voice, s.narration) } });

function production(scenes: Scene[], exists = true): ProductionContext {
  const deps = { tools: toolCatalog, media: { exists: async () => exists, absolute: (p: string) => `/data/${p}` } } as unknown as CoreDeps;
  return { deps, episode: episode({ scenes }), channel, imageStyle: channel.imageStyle, dir: '/tmp/ep' } as unknown as ProductionContext;
}

describe('scene picture prompts', () => {
  it('adds the fixed Vox style, the channel style, or the default, and skips blocks without a picture', () => {
    expect(imageSpec(vox('a', 'a Boeing 777'), toolCatalog, '')!.prompt).toBe(`a Boeing 777. ${VOX_IMAGE_STYLE}`);
    expect(imageSpec(vox('a', 'a Boeing 777'), toolCatalog, 'ink wash, loose brush')!.prompt).toBe('a Boeing 777. ink wash, loose brush');
    expect(imageSpec(picture('p'), toolCatalog, ' flat vector, pastel ')!.prompt).toBe('a street food vendor at night, medium shot. flat vector, pastel');
    expect(imageSpec(picture('p'), toolCatalog, '')!.prompt).toContain(DEFAULT_IMAGE_STYLE);
    expect(imageSpec(cards, toolCatalog, '')).toBeNull();
    expect(() => imageSpec(vox('v', '  '), toolCatalog, '')).toThrow(/mô tả ảnh/);
  });

  it('changes the hash only when the prompt (or the channel style) changes', () => {
    expect(imageSpec(picture('p'), toolCatalog, 'a')!.hash).toBe(imageSpec(picture('q'), toolCatalog, 'a')!.hash);
    expect(imageSpec(picture('p'), toolCatalog, 'a')!.hash).not.toBe(imageSpec(picture('p'), toolCatalog, 'b')!.hash);
  });
});

describe('scene readiness', () => {
  const ctx = { tools: toolCatalog, channelStyle: '', voice: 'vi-VN-HoaiMyNeural' };

  it('needs a fresh picture (when the block has one) and a fresh voice (when there is narration)', () => {
    const bare = vox('a', 'a plane');
    expect(readiness(bare, ctx)).toMatchObject({ needsImage: true, imageFresh: false, needsVoice: true, voiceFresh: false, ready: false });
    expect(readiness(withVoice(withImage(bare)), ctx).ready).toBe(true);
    expect(readiness(withVoice(cards), ctx).ready).toBe(true); // no picture needed
    expect(readiness(scene('t', 'remotion/cards', cards.props, { narration: '  ' }), ctx).ready).toBe(true); // no narration, no voice needed
  });

  it('treats a picture or voice made for different content as stale', () => {
    const ready = withVoice(withImage(vox('a', 'a plane')));
    expect(readiness({ ...ready, props: { ...ready.props, imagePrompt: 'a train' } }, ctx).imageFresh).toBe(false);
    expect(readiness({ ...ready, narration: 'Câu khác.' }, ctx).voiceFresh).toBe(false);
    expect(readiness(ready, { ...ctx, voice: 'gemini-Kore' }).voiceFresh).toBe(false);
  });
});

describe('keeping finished work when a script is rewritten', () => {
  const ctx = { tools: toolCatalog, channelStyle: '', voice: 'vi-VN-HoaiMyNeural' };

  it('gives an unchanged scene its id, assets and approval back', () => {
    const done = { ...withVoice(withImage(vox('keep', 'a plane'))), approved: true };
    const out = carryOver([done], [vox('new-id', 'a plane')], ctx);
    expect(out[0]).toMatchObject({ id: 'keep', approved: true, assets: done.assets });
  });

  it('reuses a picture or a voice that still matches, but withdraws the approval of a changed scene', () => {
    const done = { ...withVoice(withImage(vox('old', 'a plane'))), approved: true };
    const changedNarration = vox('n1', 'a plane', { narration: 'Lời khác.' });
    const out = carryOver([done], [changedNarration], ctx);
    expect(out[0]!.approved).toBe(false);
    expect(out[0]!.assets.imagePath).toBe(done.assets.imagePath); // same prompt: picture reused
    expect(out[0]!.assets.voicePath).toBeNull(); // different text: needs a new voice
    const changedPrompt = carryOver([done], [vox('n2', 'a train')], ctx);
    expect(changedPrompt[0]!.assets.imagePath).toBeNull();
    expect(changedPrompt[0]!.assets.voicePath).toBe(done.assets.voicePath); // same text: voice reused
  });

  it('matches each old scene at most once', () => {
    const done = { ...withVoice(withImage(vox('a', 'a plane'))), approved: true };
    const out = carryOver([done], [vox('x', 'a plane'), vox('y', 'a plane')], ctx);
    expect(out.map((s) => s.id)).toEqual(['a', 'y']);
    expect(out[1]!.approved).toBe(false);
  });
});

describe('production joins finished work and never pays for generation', () => {
  it('collects the approved pictures and voices as absolute files', async () => {
    const a = withVoice(withImage(vox('a', 'a plane')));
    const c = withVoice(cards);
    const p = production([a, c]);
    expect((await imagesStep.run(p, {}, () => {})).files).toEqual({ a: `/data/${a.assets.imagePath}` });
    expect((await voiceStep.run(p, {}, () => {})).lines).toEqual({ a: { file: `/data/${a.assets.voicePath}`, seconds: 2.5 }, c: { file: `/data/${c.assets.voicePath}`, seconds: 2.5 } });
  });

  it('refuses a scene whose picture or voice is missing, stale or gone, telling which scene', async () => {
    await expect(imagesStep.run(production([vox('a', 'a plane')]), {}, () => {})).rejects.toThrow(/Cảnh 1 chưa có ảnh/);
    await expect(voiceStep.run(production([withImage(vox('a', 'a plane'))]), {}, () => {})).rejects.toThrow(/Cảnh 1 chưa có giọng/);
    await expect(imagesStep.run(production([withImage(vox('a', 'a plane'))], false), {}, () => {})).rejects.toThrow(/đã bị mất/);
    const stale = { ...withVoice(withImage(vox('a', 'a plane'))), narration: 'Lời đã sửa.' };
    await expect(voiceStep.run(production([stale]), {}, () => {})).rejects.toThrow(/không khớp|chưa có giọng/);
  });

  it('runs images and voices before rendering, and the renderer receives the picture as a prop', async () => {
    const ids = orderSteps(PRODUCTION_STEPS).map((s) => s.id);
    expect(ids.indexOf('images')).toBeLessThan(ids.indexOf('render'));
    expect(ids.indexOf('voice')).toBeLessThan(ids.indexOf('render'));
    const seen: Record<string, unknown>[] = [];
    const base = production([withVoice(withImage(vox('a', 'a plane'))), cards]);
    const deps = {
      ...base.deps,
      media: { exists: async () => true, dataUri: async (f: string) => `data:image/png;base64,${f}` },
      renderers: { get: () => ({ render: async (input: { props: Record<string, unknown> }) => void seen.push(input.props) }) },
    } as unknown as CoreDeps;
    const a = withVoice(withImage(vox('a', 'a plane')));
    const ctx = { ...base, deps, episode: episode({ scenes: [a, cards], formats: ['landscape'] }), brand: {} } as unknown as ProductionContext;
    await renderStep.run(ctx, { voice: { lines: {} }, images: { files: { a: '/tmp/ep/images/a.png' } } }, () => {});
    expect(seen[0]).toMatchObject({ label: 'BOEING 777', image: 'data:image/png;base64,/tmp/ep/images/a.png' });
    expect(seen[1]).not.toHaveProperty('image');
  });
});

describe('block props', () => {
  it('cleans vox and picture props', () => {
    const v = toolCatalog.block('remotion/vox')!;
    expect(cleanProps(v, { label: ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ', imagePrompt: ' a map ', motion: 'pan-left' })).toMatchObject({ label: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123', imagePrompt: 'a map' });
    expect(() => cleanProps(v, { label: 'x', imagePrompt: 'y', motion: 'spin' })).toThrow();
    const p = toolCatalog.block('remotion/picture')!;
    expect(cleanProps(p, { caption: ' Hà Nội ', imagePrompt: ' x ', motion: 'drift-up' })).toMatchObject({ caption: 'Hà Nội', imagePrompt: 'x', motion: 'drift-up' });
  });
});

describe('scene variety', () => {
  const run = <T,>(fn: (n: number) => T, n = 24) => Array.from({ length: n }, (_, i) => fn(i + 1));
  const noRepeat = (xs: unknown[]) => xs.every((x, i) => i === 0 || x !== xs[i - 1]);

  it('never repeats the same look in two consecutive scenes', () => {
    for (const fn of [autoMotion, labelStyleFor, cornerFor, cardsLayoutFor, skyPatternFor]) expect(noRepeat(run(fn))).toBe(true);
  });

  it('uses every variant, and combinations of label look and corner keep changing', () => {
    expect(new Set(run(autoMotion)).size).toBe(6);
    expect(new Set(run(labelStyleFor)).size).toBe(4);
    expect(new Set(run(cardsLayoutFor)).size).toBe(4);
    expect(new Set(run((n) => `${labelStyleFor(n)}/${cornerFor(n)}`)).size).toBeGreaterThanOrEqual(8);
  });
});

describe('skill image style', () => {
  it('parses imageStyle from the front matter, and the skill look wins over the channel look', async () => {
    const { parseSkill, lintSkill } = await import('@/core/skills/skill');
    const { imageStyleOf } = await import('@/core/scenes/assets');
    const s = parseSkill('x', '---\nname: X\ntools: [remotion/vox]\nimageStyle: "layered paper, hard light"\n---\nbody');
    expect(s.imageStyle).toBe('layered paper, hard light');
    expect(imageStyleOf({ skill: s, channel: { imageStyle: 'channel look' } })).toBe('layered paper, hard light');
    expect(imageStyleOf({ skill: { imageStyle: '' }, channel: { imageStyle: 'channel look' } })).toBe('channel look');
    const pic = parseSkill('p', '---\nname: P\ntools: [remotion/picture]\n---\nbody');
    expect(lintSkill(pic, toolCatalog).some((i) => i.message.includes('imageStyle'))).toBe(true);
    expect(lintSkill(s, toolCatalog)).toEqual([]);
  });
});

describe('variety and shots', () => {
  const sc = (id: string, shot: string): Scene => ({ ...vox(id, 'a thing'), props: { label: '', imagePrompt: 'a thing', motion: 'auto', shot } });

  it('puts the camera shot into the picture prompt, so a new shot means a new picture', () => {
    const a = imageSpec(sc('a', 'macro'), toolCatalog, '')!;
    const b = imageSpec(sc('a', 'wide'), toolCatalog, '')!;
    expect(a.prompt).toContain('Extreme macro');
    expect(a.hash).not.toBe(b.hash);
    expect(imageSpec(sc('a', 'auto'), toolCatalog, '')!.prompt).toBe(`a thing. ${VOX_IMAGE_STYLE}`);
  });

  it('warns about neighbours with the same shot and a shot used too often', async () => {
    const { QUALITY_CHECKS } = await import('@/core/quality/checks');
    const check = QUALITY_CHECKS.find((c) => c.id === 'variety')!;
    const run = (shots: string[]) => check.run({ scenes: shots.map((s, i) => sc(`s${i}`, s)), tools: toolCatalog } as never);
    expect(run(['wide', 'macro', 'split', 'top-down', 'cluster'])).toEqual([]);
    expect(run(['wide', 'wide', 'macro']).some((i) => i.message.includes('liền nhau'))).toBe(true);
    expect(run(['wide', 'macro', 'wide', 'split', 'wide']).some((i) => i.message.includes('lặp 3/5'))).toBe(true);
  });
});

describe('design similarity', () => {
  it('sees a tweaked design as the same picture and a new layout as different', async () => {
    const { fallbackDesign, designSimilarity } = await import('@/core/domain/design');
    const a = fallbackDesign('intro', ['#112233']);
    const tweaked = { ...a, layers: a.layers.map((l) => ({ ...l, delay: l.delay + 0.1 })) };
    const moved = { ...a, background: { ...a.background, colors: ['#FFFFFF'], texture: 'dots' as const }, layers: a.layers.map((l) => ({ ...l, land: { ...l.land, x: 20, y: 85 } })) };
    expect(designSimilarity(a, a)).toBe(1);
    expect(designSimilarity(a, tweaked)).toBeGreaterThanOrEqual(0.7);
    expect(designSimilarity(a, moved)).toBeLessThan(0.4);
  });
});

describe('spoken narration check', () => {
  it('flags a script with no questions, uniform sentences and repeated openings', async () => {
    const { QUALITY_CHECKS } = await import('@/core/quality/checks');
    const check = QUALITY_CHECKS.find((c) => c.id === 'spoken')!;
    const mk = (lines: string[]) => lines.map((narration, i) => ({ ...vox(`n${i}`, 'x'), narration }));
    const flat = check.run({ scenes: mk(['Tại đây nước rất sâu và lạnh lẽo vô cùng.', 'Tại đây áp suất rất lớn và đáng sợ vô cùng.', 'Họ đã xuống tới đáy biển sâu nhất thế giới.', 'Sau đó họ phát hiện ra một loài cá rất lạ.']) } as never);
    expect(flat.map((i) => i.message).join(' ')).toMatch(/câu hỏi/);
    expect(flat.map((i) => i.message).join(' ')).toMatch(/rất ngắn/);
    expect(flat.some((i) => i.message.includes('tại đây'))).toBe(true);
    const good = check.run({ scenes: mk(['Bạn đoán nó sâu bao nhiêu?', 'Mười một cây số. Nghe thì xa.', 'Nhưng chưa hết, và đây mới là chỗ lạ.', 'Họ chạm đáy. Rồi im lặng.']) } as never);
    expect(good).toEqual([]);
  });
});

describe('one-off video format', () => {
  it('always has the channel intro and outro as locked slots, and the AI only writes the content', async () => {
    const { formatFromSkill } = await import('@/core/series/format');
    const f = formatFromSkill({ id: 'v', name: 'V', description: '', tools: ['remotion/vox', 'remotion/outro'], scenes: { min: 8, max: 12 }, body: '', version: '1', tags: [], imageStyle: '' }, null, toolCatalog);
    expect(f.slots.map((s) => [s.id, s.fill])).toEqual([['intro', 'locked'], ['body', 'ai'], ['outro', 'locked']]);
    expect(f.slots[1]!.blocks).toEqual(['remotion/vox']);
    expect(f.slots[0]!.locked!.block).toBe('remotion/title');
    expect(f.slots[2]!.locked!.narration).toBe('{outro}');
  });
});

describe('locked intro and outro added to an older script', () => {
  it('puts the channel intro first and outro last, and drops the AI scene that imitated the outro', async () => {
    const { formatFromSkill } = await import('@/core/series/format');
    const { withLockedScenes } = await import('@/core/script/script');
    const f = formatFromSkill({ id: 'v', name: 'V', description: '', tools: ['remotion/vox'], scenes: { min: 2, max: 9 }, body: '', version: '1', tags: [], imageStyle: '' }, null, toolCatalog);
    const body = (id: string, block = 'remotion/vox'): Scene => ({ ...vox(id, 'x'), slotId: 'body', block });
    const out = withLockedScenes(f.slots, [body('a'), body('b'), body('c', 'remotion/outro')], { title: 'T', outro: 'Hẹn gặp lại' }, toolCatalog)!;
    expect(out.map((s) => [s.slotId, s.block])).toEqual([['intro', 'remotion/title'], ['body', 'remotion/vox'], ['body', 'remotion/vox'], ['outro', 'remotion/outro']]);
    expect(out[3]!.narration).toBe('Hẹn gặp lại');
    expect(out.slice(1, 3).map((s) => s.id)).toEqual(['a', 'b']);
    expect(withLockedScenes(f.slots, out, {}, toolCatalog)).toBeNull();
  });
});
