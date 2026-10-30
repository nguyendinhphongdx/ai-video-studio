import { describe, expect, it } from 'vitest';

import type { Scene } from '@/core/domain/episode';
import { NARRATION_DELAY_SEC, buildTimeline, estimateSpeechSec, sceneDuration } from '@/core/timeline';

describe('timeline', () => {
  it('keeps the block minimum when narration is short', () => {
    expect(sceneDuration(5, 1)).toBe(5);
  });

  it('stretches to narration plus delay and tail padding', () => {
    expect(sceneDuration(2, 10)).toBeCloseTo(10 + NARRATION_DELAY_SEC + 0.7);
  });

  it('treats silent scenes as the block minimum', () => {
    expect(sceneDuration(3, 0)).toBe(3);
  });

  it('estimates zero seconds for empty text', () => {
    expect(estimateSpeechSec('   ')).toBe(0);
  });
});
