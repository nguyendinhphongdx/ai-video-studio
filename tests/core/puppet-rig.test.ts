import { describe, expect, it } from 'vitest';

import { ANCHOR_X, ENTER_SECONDS, expressionAt, isBlinking, poseAt, poseFromKeys, sampleKeys } from '@video/puppet/rig';

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
});
