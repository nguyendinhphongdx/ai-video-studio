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
    expect(new Set(run(autoMotion)).size).toBe(18);
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
    // A picture block takes its look from the channel, so a skill without imageStyle is fine.
    expect(lintSkill(pic, toolCatalog)).toEqual([]);
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

describe('camera moves', () => {
  it('are deterministic, start near the frame and keep the picture covering it', async () => {
    const { MOVES, poseAt } = await import('../../remotion/camera/moves');
    for (const m of MOVES) {
      expect(poseAt(m, 0.5, 40)).toEqual(poseAt(m, 0.5, 40));
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const p = poseAt(m, t, Math.round(t * 120));
        expect(p.scale).toBeGreaterThanOrEqual(1);
        expect(Math.abs(p.rotX)).toBeLessThanOrEqual(54);
        expect(Math.abs(p.rotY)).toBeLessThanOrEqual(50);
      }
    }
    expect(poseAt('crash-zoom', 0.1, 10).scale).toBeGreaterThan(poseAt('crash-zoom', 0, 0).scale + 0.2);
    expect(poseAt('orbit-left', 0, 0).rotY).toBeGreaterThan(0);
    expect(poseAt('orbit-left', 1, 0).rotY).toBeLessThan(0);
  });

  it('floats some scenes over a blurred copy, never two in a row', async () => {
    const { layeredFor } = await import('../../remotion/blocks/variants');
    const flags = Array.from({ length: 20 }, (_, i) => layeredFor(i + 1));
    expect(flags.some(Boolean)).toBe(true);
    expect(flags.every(Boolean)).toBe(false);
    expect(flags.every((f, i) => i === 0 || !(f && flags[i - 1]))).toBe(true);
  });
});

describe('design legibility and art', () => {
  it('keeps text readable and stops a full-frame panel from hiding the AI art', async () => {
    const { normalizeDesign, fallbackDesign } = await import('@/core/domain/design');
    const base = fallbackDesign('intro', ['#112233']);
    const text = (t: string, size: number) => ({ kind: 'text' as const, anim: 'fade' as const, delay: 0, land: { x: 50, y: 50, w: 60, h: 10 }, port: { x: 50, y: 50, w: 60, h: 10 }, text: t, size, weight: '800' as const, color: '#FFFFFF', font: 'brand' as const, upper: false, spacing: 0, align: 'center' as const });
    const frame = { x: 50, y: 50, w: 100, h: 100 };
    const veil = { kind: 'shape' as const, anim: 'fade' as const, delay: 0, land: frame, port: frame, shape: 'rect' as const, fill: '#000000', opacity: 0.95, radius: 0, rotate: 0 };
    const art = { kind: 'art' as const, anim: 'fade' as const, delay: 0, land: frame, port: frame, opacity: 1 };
    const out = normalizeDesign({ ...base, layers: [art, veil, text('{title}', 2), text('nhãn nhỏ', 1)] }, ['#112233']);
    expect(out.layers[1]).toMatchObject({ kind: 'shape', opacity: 0.45 });
    expect(out.layers[2]).toMatchObject({ size: 5 });
    expect(out.layers[3]).toMatchObject({ size: 3 });
    // Without art underneath the panel keeps its opacity.
    expect(normalizeDesign({ ...base, layers: [veil, text('x', 4), text('y', 4), text('z', 4)] }, ['#112233']).layers[0]).toMatchObject({ opacity: 0.95 });
  });
});

describe('kinetic, counter and chart blocks', () => {
  it('pick the emphasised word, parse Vietnamese number formats and keep the chart to six rows', async () => {
    const { emphasisIndex } = await import('../../remotion/blocks/kinetic');
    const { parseChart } = await import('../../remotion/blocks/chart-data');
    expect(emphasisIndex(['Điều', 'gì', 'nằm', 'dưới', 'đáy', 'biển?'], 'Đáy')).toBe(4);
    expect(emphasisIndex(['Điều', 'gì', 'nằm', 'dưới', 'đáy', 'biển?'], '')).toBe(0);
    expect(parseChart('Everest: 8849\nMariana - 10.994\nSao Hỏa = 3,5 km\nrác dòng này\nHồ: 12,5').map((i) => [i.label, i.value])).toEqual([['Everest', 8849], ['Mariana', 10994], ['Sao Hỏa', 3.5], ['Hồ', 12.5]]);
    expect(parseChart(Array.from({ length: 9 }, (_, i) => `M${i}: ${i + 1}`).join('\n'))).toHaveLength(6);
  });

  it('are in the Remotion tool with sound cues that stay inside the scene', async () => {
    const { toolCatalog } = await import('@/tools/registry');
    for (const ref of ['remotion/kinetic', 'remotion/counter', 'remotion/chart']) {
      const b = toolCatalog.block(ref)!;
      expect(b, ref).toBeDefined();
      const cues = b.sfx!({ props: b.defaults as Record<string, unknown>, ordinal: 1, durationSec: b.minSeconds });
      expect(cues.length).toBeGreaterThan(0);
      for (const c of cues) expect(c.at).toBeLessThan(b.minSeconds);
    }
    const chart = toolCatalog.block('remotion/chart')!;
    expect(chart.normalize!({ title: ' T ', unit: 'm', data: 'a: 1\nxấu\nb: 2' } as never)).toMatchObject({ title: 'T', data: 'a: 1\nb: 2' });
    const counter = toolCatalog.block('remotion/counter')!;
    expect(counter.normalize!({ value: 'abc 10.994 m', unit: '', caption: '' } as never)).toMatchObject({ value: '10.994' });
  });
});

describe('scene entrances', () => {
  it('are fixed for a block and order, and vary across the scenes of a video', async () => {
    const { entranceFor } = await import('../../remotion/shots/transitions');
    expect(entranceFor('remotion/vox', 3)).toBe(entranceFor('remotion/vox', 3));
    const seen = new Set(Array.from({ length: 12 }, (_, i) => entranceFor('remotion/vox', i + 1)));
    expect(seen.size).toBeGreaterThanOrEqual(8);
    const { ENTRANCES } = await import('../../remotion/shots/transitions');
    expect(ENTRANCES).toHaveLength(17);
    const run = Array.from({ length: 60 }, (_, i) => entranceFor('remotion/picture', i + 1));
    expect(new Set(run).size).toBe(17);
    expect(run.every((e, i) => i === 0 || e !== run[i - 1])).toBe(true);
    expect(new Set(['remotion/vox', 'remotion/picture', 'remotion/kinetic', 'remotion/chart'].map((b) => entranceFor(b, 1))).size).toBeGreaterThan(1);
  });

  it('lifts a near-black channel colour for text scenes instead of turning it flat black', async () => {
    const { stageBackground } = await import('../../remotion/primitives');
    expect(stageBackground('#0F172A')).not.toContain('rgb(0, 0, 0)');
    expect(stageBackground('#5B3DF5')).toContain('radial-gradient');
  });
});

describe('text shots', () => {
  it('has a drawing for every listed shot, unique ids, and the rotations only use real shots', async () => {
    const { TEXT_SHOT_META } = await import('../../remotion/shots/text/meta');
    const { TEXT_SHOTS } = await import('../../remotion/shots/text');
    const { kineticLookFor } = await import('../../remotion/blocks/variants');
    const ids: string[] = TEXT_SHOT_META.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TEXT_SHOTS.map((s) => s.id)).toEqual(ids);
    for (const s of TEXT_SHOTS) expect(typeof s.Component, s.id).toBe('function');
    const plain = Array.from({ length: 20 }, (_, i) => kineticLookFor(i + 1, false));
    const cycling = Array.from({ length: 20 }, (_, i) => kineticLookFor(i + 1, true));
    expect(plain.every((id) => ids.includes(id) && !TEXT_SHOT_META.find((m) => m.id === id)!.items)).toBe(true);
    expect(cycling.every((id) => ids.includes(id) && TEXT_SHOT_META.find((m) => m.id === id)!.items)).toBe(true);
    expect(new Set(plain).size).toBeGreaterThanOrEqual(10);
  });

  it('give the kinetic block a look per shot and normalise its lines', async () => {
    const { toolCatalog } = await import('@/tools/registry');
    const b = toolCatalog.block('remotion/kinetic')!;
    const look = b.fields.find((f) => f.key === 'look')!;
    expect(look.options!.length).toBe(28);
    expect(b.normalize!({ text: 'x', emphasis: 'a b', items: ' một \n\n hai \nba\nbốn\nnăm\nsáu\nbảy', look: 'auto' } as never)).toMatchObject({ emphasis: 'a', items: 'một\nhai\nba\nbốn\nnăm\nsáu' });
    const cues = b.sfx!({ props: { ...(b.defaults as Record<string, unknown>), look: 'pill-slot', items: 'a\nb\nc' }, ordinal: 1, durationSec: 6 });
    expect(cues.length).toBe(3);
    expect(b.aiGuide).toContain('pill-slot');
  });
});

describe('light effects and the newer camera moves', () => {
  it('draw every listed effect, rotate through real ones, and give the new moves a sound', async () => {
    const { FX_META, FX_IDS } = await import('../../remotion/shots/fx-meta');
    const { fxFor } = await import('../../remotion/blocks/variants');
    const { moveCue } = await import('@/tools/remotion/blocks/shared');
    const { MOVES } = await import('../../remotion/camera/moves');
    expect(FX_IDS).toEqual(FX_META.map((m) => m.id));
    const cycle = Array.from({ length: 32 }, (_, i) => fxFor(i + 1));
    expect(cycle.every((id) => (FX_IDS as string[]).includes(id))).toBe(true);
    expect(cycle.filter((id) => id === 'none').length).toBeGreaterThanOrEqual(10);
    expect(new Set(cycle).size).toBe(FX_IDS.length);
    expect(MOVES).toHaveLength(18);
    expect(moveCue('crash-zoom')[0]!.kind).toBe('impact');
    expect(moveCue('bullet-time')[0]!.kind).toBe('whoosh');
    expect(moveCue('zoom-in')).toEqual([]);
  });
});

describe('rhythm cuts and data scenes', () => {
  it('lists every cut, rotates through real ones mostly as none, and gives cuts a sound', async () => {
    const { CUT_META, CUT_IDS } = await import('../../remotion/shots/cut-meta');
    const { cutFor } = await import('../../remotion/blocks/variants');
    const { cutCue } = await import('@/tools/remotion/blocks/shared');
    expect(CUT_IDS).toEqual(CUT_META.map((m) => m.id));
    const run = Array.from({ length: 34 }, (_, i) => cutFor(i + 1));
    expect(run.every((c) => (CUT_IDS as string[]).includes(c))).toBe(true);
    expect(run.filter((c) => c === 'none').length).toBeGreaterThanOrEqual(20);
    expect(new Set(run).size).toBe(CUT_IDS.length);
    expect(cutCue('flash-freeze')).toHaveLength(3);
    expect(cutCue('none')).toEqual([]);
  });

  it('parses timelines and numbers, throws the needle past the value and settles on it, and lights the right dots', async () => {
    const { parseTimeline, parseNumber } = await import('../../remotion/blocks/data-parse');
    const { needleAt } = await import('../../remotion/blocks/gauge');
    const { litDots } = await import('../../remotion/blocks/dots');
    expect(parseTimeline('1957: Vệ tinh\nsai dòng\n1969 - Mặt Trăng\n').map((i) => [i.label, i.text])).toEqual([['1957', 'Vệ tinh'], ['1969', 'Mặt Trăng']]);
    expect(parseTimeline(Array.from({ length: 9 }, (_, i) => `${i}: x`).join('\n'))).toHaveLength(6);
    expect(parseNumber('1.250')).toBe(1250);
    expect(parseNumber('3,5')).toBe(3.5);
    expect(parseNumber('abc')).toBeNull();
    expect(needleAt(0, 0.72)).toBe(0);
    expect(needleAt(30, 0.72)).toBeCloseTo(1, 1);
    expect(needleAt(200, 0.72)).toBeCloseTo(0.72, 2);
    expect(litDots(3, 10)).toBe(30);
    expect(litDots(1, 1000)).toBe(1);
    expect(litDots(5, 0)).toBe(0);
  });

  it('normalise the data blocks', async () => {
    const { toolCatalog } = await import('@/tools/registry');
    const gauge = toolCatalog.block('remotion/gauge')!;
    expect(gauge.normalize!({ value: '250', min: '0', max: '100', unit: ' % ', caption: ' c ' } as never)).toMatchObject({ value: '100', unit: '%', caption: 'c' });
    const dots = toolCatalog.block('remotion/dots')!;
    expect(dots.normalize!({ part: '12', whole: '10', caption: '' } as never)).toMatchObject({ part: '10', whole: '10' });
    const timeline = toolCatalog.block('remotion/timeline')!;
    expect(timeline.normalize!({ title: 'T', data: 'a: 1\nx\nb - 2' } as never)).toMatchObject({ data: 'a: 1\nb: 2' });
    for (const ref of ['remotion/timeline', 'remotion/gauge', 'remotion/dots']) {
      const b = toolCatalog.block(ref)!;
      for (const c of b.sfx!({ props: b.defaults as Record<string, unknown>, ordinal: 1, durationSec: b.minSeconds })) expect(c.at).toBeLessThan(b.minSeconds);
    }
  });
});

describe('choosing how a scene opens', () => {
  it('uses the entrance a scene names, ignores an unknown one, and every content block offers the choice', async () => {
    const { entranceFor } = await import('../../remotion/shots/transitions');
    const { ENTRANCE_META } = await import('../../remotion/shots/entrance-meta');
    const { toolCatalog } = await import('@/tools/registry');
    expect(entranceFor('remotion/vox', 3, 'glitch')).toBe('glitch');
    expect(entranceFor('remotion/vox', 3, 'auto')).toBe(entranceFor('remotion/vox', 3));
    expect(entranceFor('remotion/vox', 3, 'nope')).toBe(entranceFor('remotion/vox', 3));
    for (const ref of ['vox', 'picture', 'kinetic', 'counter', 'chart', 'timeline', 'gauge', 'dots']) {
      const b = toolCatalog.block(`remotion/${ref}`)!;
      const f = b.fields.find((x) => x.key === 'transition')!;
      expect(f.options).toHaveLength(ENTRANCE_META.length + 1);
      expect((b.defaults as Record<string, unknown>).transition).toBe('auto');
    }
  });
});

describe('intro/outro vocabulary', () => {
  it('accepts the newer entrances, shapes and the marquee layer, and clamps a marquee into drawable values', async () => {
    const { SceneDesignSchema, normalizeDesign, fallbackDesign } = await import('@/core/domain/design');
    const base = fallbackDesign('intro', ['#112233']);
    const f = { x: 50, y: 50, w: 100, h: 16 };
    const design = {
      ...base,
      layers: [
        { kind: 'shape', anim: 'blur-in', delay: 0, land: f, port: f, shape: 'glow', fill: '#38BDF8', opacity: 0.4, radius: 0, rotate: 0 },
        { kind: 'marquee', anim: 'fade', delay: 0, land: f, port: f, text: 'x'.repeat(80), size: 99, color: 'nope', outline: true, direction: 'left', opacity: 7 },
        { kind: 'text', anim: 'materialize', delay: 0.2, land: f, port: f, text: '{channel}', size: 4, weight: '600', color: '#FFFFFF', font: 'brand', upper: true, spacing: 18, align: 'center' },
      ],
    };
    const parsed = SceneDesignSchema.parse(design);
    expect(parsed.layers).toHaveLength(3);
    const out = normalizeDesign(parsed, ['#112233', '#F59E0B']);
    expect(out.layers[1]).toMatchObject({ kind: 'marquee', size: 30, color: '#F59E0B', opacity: 1 });
    expect((out.layers[1] as { text: string }).text).toHaveLength(40);
    expect(() => SceneDesignSchema.parse({ ...design, layers: [{ ...design.layers[2], anim: 'explode' }] })).toThrow();
  });

  it('tells the assistant the valid entrances', async () => {
    const { DESIGN_GUIDE } = await import('@/core/assistant/guides');
    for (const a of ['materialize', 'stamp', 'glitch', 'crash-in', 'marquee', 'rays']) expect(DESIGN_GUIDE).toContain(a);
  });
});
