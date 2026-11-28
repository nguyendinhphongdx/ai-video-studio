import { describe, expect, it } from 'vitest';

import { cleanProps } from '@/core/tools/tool';
import { puppetBlock } from '@/tools/remotion/blocks/puppet';

describe('cleanProps', () => {
  it('gives scenes written before a block gained a prop the block default', () => {
    // A puppet scene from before mood, pose and companionAction existed.
    const old = { caption: 'Na Tra', imagePrompt: 'a beach', emotion: 'happy', action: 'enter', side: 'left', companion: '', item: '', transition: 'auto' };
    const p = cleanProps(puppetBlock, old);
    expect(p).toMatchObject({ mood: 'calm', pose: '', companionAction: 'idle', emotion: 'happy', action: 'enter' });
  });

  it('keeps rejecting a value the block does not allow', () => {
    expect(() => cleanProps(puppetBlock, { ...puppetBlock.defaults, mood: 'lava' })).toThrow();
  });
});
