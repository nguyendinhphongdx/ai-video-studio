import { describe, expect, it } from 'vitest';

import { onboardingSteps, progress } from '@/features/onboarding/lib/steps';

const base = { llmReady: false, channelDesigned: false, episodeCount: 0, imageReady: false, voiceReady: false };

describe('first-run steps', () => {
  it('starts with nothing done and counts only the three required steps', () => {
    const steps = onboardingSteps(base);
    expect(steps.map((s) => s.done)).toEqual([false, false, false, false]);
    expect(progress(steps)).toEqual({ done: 0, total: 3, finished: false });
  });

  it('a person who already made a video does not have to be sent to design the channel', () => {
    const steps = onboardingSteps({ ...base, llmReady: true, episodeCount: 2 });
    expect(progress(steps)).toEqual({ done: 3, total: 3, finished: true });
  });

  it('the optional step never blocks finishing', () => {
    const steps = onboardingSteps({ ...base, llmReady: true, channelDesigned: true, episodeCount: 1 });
    expect(steps[3]!.done).toBe(false);
    expect(progress(steps).finished).toBe(true);
    expect(onboardingSteps({ ...base, imageReady: true, voiceReady: true })[3]!.done).toBe(true);
  });
});
