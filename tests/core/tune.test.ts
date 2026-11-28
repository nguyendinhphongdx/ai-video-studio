import { describe, expect, it } from 'vitest';

import { z } from 'zod';

import { castForScene } from '@/core/character/expressions';
import { parseTune, patchTune, spanAt, TunePatchSchema, ToolTuneSchema } from '@/core/domain/tune';
import { carryOver, voiceHashOf } from '@/core/scenes/assets';
import { fixSceneTask, type FixSceneInput } from '@/core/tasks/fix-scene';
import { buildTimeline, sceneDuration } from '@/core/timeline';
import { cleanProps } from '@/core/tools/tool';
import { planCues } from '@/core/audio/sfx';
import { toolCatalog } from '@/tools/registry';

const puppet = toolCatalog.block('remotion/puppet')!;

describe('hand adjustments of a scene', () => {
  it('keeps what was changed, clamps it and drops defaults', () => {
    expect(parseTune({ hero: { dx: 5, dy: 0, scale: 1 }, companion: { dx: 0, dy: 0, scale: 1 }, holdSec: 0, sfxVolume: 1, captionLook: 'nope' })).toEqual({ hero: { dx: 0.8, dy: 0, scale: 1 } });
    expect(parseTune({ sfxVolume: 1 })).toBeNull();
    expect(parseTune('junk')).toBeNull();
  });

  it('survives block cleaning, and adds nothing to untouched scenes', () => {
    expect(cleanProps(puppet, { ...puppet.defaults as object, _tune: { holdSec: 2 } })._tune).toEqual({ holdSec: 2 });
    expect(cleanProps(puppet, puppet.defaults)).not.toHaveProperty('_tune');
  });

  it('lengthens the scene, silences its effects, and changes the voice only when the delivery does', () => {
    expect(sceneDuration(3, 0, 2)).toBe(5);
    const scenes = [{ id: 'a', block: 'x', props: { _tune: { sfxVolume: 0 } }, ordinal: 1 }];
    expect(planCues(scenes, [4], () => [{ kind: 'pop', at: 1 }])).toEqual([]);
    expect(voiceHashOf('v', 'lời', {})).toBe(voiceHashOf('v', 'lời'));
    expect(voiceHashOf('v', 'lời', { speed: 'slow' })).not.toBe(voiceHashOf('v', 'lời'));
  });

  it('times a layer, and a later voice makes the scene longer', () => {
    expect(parseTune({ captionTime: { from: 3, to: 1 } })).toEqual({ captionTime: { from: 3 } });
    expect(spanAt({ from: 3 }, 2).on).toBe(false);
    expect(spanAt({ from: 3 }, 4)).toEqual({ on: true, local: 1 });
    const scene = { id: 'a', slotId: 's', block: 'x' as never, locked: false, narration: 'n', approved: false, assets: {} as never };
    const total = (props: Record<string, unknown>) => buildTimeline([{ ...scene, props }], () => 1, () => 4).total;
    expect(total({ _tune: { voiceDelay: 2 } })).toBeCloseTo(total({}) + 2);
  });

  it('keeps added figures, asks for their pictures, and caps how many', () => {
    const extras = Array.from({ length: 10 }, () => ({ id: 'ly-tinh', kind: 'person' }));
    expect(parseTune({ extras })?.extras).toHaveLength(8);
    const cast = { 'ly-tinh': 'a', 'ly-tinh:talk': 'b', other: 'c' };
    expect(castForScene({ _tune: { extras: extras.slice(0, 2) } }, cast)).toEqual(['ly-tinh', 'ly-tinh:talk']);
  });

  it('lets an AI patch any adjustment, keeping what it does not name and resetting what it asks', () => {
    const old = { holdSec: 2, sfxVolume: 0 };
    const next = patchTune(old, { reset: ['sfxVolume'], captionPlace: 'top', extras: [{ id: 'ly-tinh', x: null, y: null, scale: 1.2, action: 'wave', emotion: null, flip: true, front: null, enter: 'left', motion: null, glow: null, time: null }] });
    expect(next).toMatchObject({ holdSec: 2, captionPlace: 'top', extras: [{ id: 'ly-tinh', x: 0.1, action: 'wave', flip: true, enter: 'left', emotion: 'neutral' }] });
    expect(next?.sfxVolume).toBeUndefined();
  });

  it('describes every adjustment to the AI, so none is out of its reach', () => {
    const knobs = Object.keys(TunePatchSchema.shape).filter((k) => k !== 'reset');
    const json = JSON.stringify(z.toJSONSchema(ToolTuneSchema));
    for (const key of [...knobs, 'flip', 'front', 'enter', 'motion', 'glow', 'emotion', 'action']) expect(json).toContain(`"${key}"`);
  });

  it('stays on a scene the AI rewrote without changing what it says', () => {
    const base = { id: 'a', slotId: 'body', block: puppet.id, locked: false, narration: 'Một lời', approved: true, assets: { imagePath: null, imageHash: null, voicePath: null, voiceSeconds: null, voiceHash: null } };
    const previous = [{ ...base, block: 'remotion/puppet' as const, props: { ...(puppet.defaults as object), _tune: { holdSec: 1 } } }];
    const next = [{ ...base, id: 'b', block: 'remotion/puppet' as const, props: { ...(puppet.defaults as object), caption: 'mới' } }];
    expect(carryOver(previous, next, { tools: toolCatalog, channelStyle: '', voice: 'v' })[0]!.props._tune).toEqual({ holdSec: 1 });
  });
});

describe('fix-scene', () => {
  const input: FixSceneInput = {
    block: puppet,
    scene: { id: 'a', slotId: 'body', block: 'remotion/puppet', locked: false, narration: 'Na Tra vẫy tay.', props: puppet.defaults as Record<string, unknown>, approved: false, assets: { imagePath: null, imageHash: null, voicePath: null, voiceSeconds: null, voiceHash: null } },
    before: null,
    after: null,
    cast: [{ id: 'ly-tinh', kind: 'character', about: 'cha' }],
    request: '',
  };
  const raw = (props: object) => ({ narration: 'Lời khác', props: { ...(puppet.defaults as object), imagePrompt: 'a lotus pond at dawn', ...props }, switchTo: null, tune: { ...Object.fromEntries(Object.keys(TunePatchSchema.shape).map((k) => [k, null])), hero: { dx: -0.2, dy: 0, scale: 1 } }, note: 'ok' });

  it('never invents a character and never rewrites the words unless asked', () => {
    const out = fixSceneTask.parse(raw({ companion: 'khong-co', lead: 'ly-tinh' }), input, {} as never);
    expect(out.narration).toBe('Na Tra vẫy tay.');
    expect(out.props.companion).toBe('');
    expect(out.props.lead).toBe('ly-tinh');
    expect(out.props._tune).toEqual({ hero: { dx: -0.2, dy: 0, scale: 1 } });
    expect(fixSceneTask.parse(raw({}), { ...input, request: 'đổi lời' }, {} as never).narration).toBe('Lời khác');
  });
});
