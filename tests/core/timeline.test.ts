import { describe, expect, it } from 'vitest';

import type { Scene } from '@/core/domain/episode';
import { NARRATION_DELAY_SEC, buildTimeline, estimateSpeechSec, sceneDuration } from '@/core/timeline';

describe('timeline', () => {
  it('keeps the block minimum when narration is short', () => {
    expect(sceneDuration(5, 1)).toBe(5);
  });
});
