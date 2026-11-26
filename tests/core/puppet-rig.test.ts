import { describe, expect, it } from 'vitest';

import { ANCHOR_X, ENTER_SECONDS, expressionAt, isBlinking, poseAt, poseFromKeys, sampleKeys, spriteAt } from '@video/puppet/rig';

describe('puppet rig', () => {
  it('interpolates keyframes and holds the ends', () => {
    const keys = [{ t: 0, x: 0.2, alpha: 0 }, { t: 1, x: 0.8, alpha: 1 }];
    expect(sampleKeys(keys, -1, 'x', 0.5)).toBe(0.2);
    expect(sampleKeys(keys, 2, 'x', 0.5)).toBe(0.8);
    expect(sampleKeys(keys, 0.5, 'x', 0)).toBeCloseTo(0.5, 5);
    expect(sampleKeys(keys, 0.5, 'angle', 7)).toBe(7);
    expect(poseFromKeys(keys, 0.5).alpha).toBeCloseTo(0.5, 5);
  });

  it('walks in from off-screen and settles on its side', () => {
    expect(poseAt('enter', 'right', 0, 6).x).toBeGreaterThan(1);
    expect(poseAt('enter', 'left', 0, 6).x).toBeLessThan(0);
    expect(poseAt('enter', 'right', ENTER_SECONDS + 0.1, 6).x).toBeCloseTo(ANCHOR_X.right, 2);
  });

  it('walks out at the end of the scene only', () => {
    expect(poseAt('exit', 'left', 1, 6).x).toBeCloseTo(ANCHOR_X.left, 2);
    expect(poseAt('exit', 'left', 6, 6).x).toBeLessThan(0);
  });

  it('keeps the feet on the ground while idle and leaves it while jumping', () => {
    expect(poseAt('idle', 'center', 2, 6).y).toBe(0);
    expect(poseAt('jump', 'center', 0.3, 6).y).toBeGreaterThan(0.05);
  });

  it('picks only sprites that exist and falls back to neutral', () => {
    expect(expressionAt({ emotion: 'angry', talking: false, t: 1, available: ['neutral'] })).toBe('neutral');
    expect(expressionAt({ emotion: 'happy', talking: false, t: 1, available: ['neutral', 'happy'] })).toBe('happy');
    const t = Array.from({ length: 200 }, (_, i) => i * 0.1).find((x) => isBlinking(x))!;
    expect(expressionAt({ emotion: 'happy', talking: true, t, available: ['neutral', 'blink', 'talk', 'happy'] })).toBe('blink');
  });

  it('opens and closes the mouth while talking', () => {
    const shown = new Set(Array.from({ length: 60 }, (_, i) => expressionAt({ emotion: 'neutral', talking: true, t: 5 + i * 0.07, available: ['neutral', 'talk'] })));
    expect(shown.has('talk') && shown.has('neutral')).toBe(true);
  });

  describe('pose sprites', () => {
    const faces = ['neutral', 'talk', 'blink', 'happy'];
    const all = [...faces, 'walk1', 'walk2', 'walk3', 'walk4', 'wave1', 'wave2', 'point', 'bow', 'crouch', 'leap'];
    const at = (action: Parameters<typeof spriteAt>[0]['action'], t: number, available = all, side: 'left' | 'center' | 'right' = 'left') =>
      spriteAt({ action, side, emotion: 'happy', talking: true, t, duration: 6, available });

    it('cycles the walk frames while entering, then falls back to the face', () => {
      const frames = new Set([0, 0.2, 0.4, 0.6, 0.8].map((t) => at('enter', t).sprite));
      expect(frames.size).toBeGreaterThan(2);
      for (const f of frames) expect(f).toMatch(/^walk[1-4]$/);
      expect(at('enter', ENTER_SECONDS + 0.5).posed).toBe(false);
    });

    it('mirrors the walk frames when the body travels to the left', () => {
      expect(at('enter', 0.1, all, 'left').flip).toBe(false);
      expect(at('enter', 0.1, all, 'right').flip).toBe(true);
      expect(at('exit', 5.9, all, 'left').flip).toBe(true);
    });

    it('alternates the wave frames, then talks', () => {
      expect(new Set([0, 0.25, 0.5, 0.75].map((t) => at('wave', t).sprite))).toEqual(new Set(['wave1', 'wave2']));
      expect(at('wave', 4).posed).toBe(false);
    });

    it('crouches on the ground and leaps in the air when jumping', () => {
      expect(at('jump', 0.05).sprite).toBe('crouch');
      expect(at('jump', 0.6).sprite).toBe('leap');
    });

    it('holds a gesture pose and bows only for a moment', () => {
      expect(at('point', 3).sprite).toBe('point');
      expect(at('bow', 1).sprite).toBe('bow');
      expect(at('bow', 4).posed).toBe(false);
    });

    it('acts as before with only face sprites', () => {
      for (const action of ['enter', 'wave', 'jump', 'point', 'sit'] as const) expect(at(action, 0.6, faces).posed).toBe(false);
      expect(poseAt('wave', 'center', 0.5, 6, true).angle).toBe(0);
      expect(poseAt('wave', 'center', 0.5, 6, false).angle).not.toBe(0);
    });
  });
});

