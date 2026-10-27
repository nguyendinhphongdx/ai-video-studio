import { describe, expect, it } from 'vitest';

import { channelToolkit } from '@/features/channel/lib/toolkit';

const b = (ref: string, name: string) => ({ ref, name, summary: '', defaults: {} });
const tools = [{ id: 'remotion', blocks: [b('remotion/picture', 'Ảnh'), b('remotion/kinetic', 'Chữ'), b('remotion/cards', 'Thẻ'), b('remotion/outro', 'Kết')] }];

describe('channel toolkit', () => {
  it('lists the scene types the skills allow and the ones nobody uses', () => {
    const kit = channelToolkit([{ id: 's', name: 'S', tools: ['remotion/picture', 'remotion/outro'], update: null }], tools);
    expect(kit.blocks.map((x) => x.ref)).toEqual(['remotion/picture', 'remotion/outro']);
    expect(kit.unused.map((x) => x.ref)).toEqual(['remotion/kinetic', 'remotion/cards']);
    expect(kit.looks.camera).toBeGreaterThan(10);
    expect(kit.looks.text).toBeUndefined();
  });

  it('counts a whole tool, unions several skills, and flags skills with a newer version', () => {
    const kit = channelToolkit([{ id: 'a', name: 'A', tools: ['remotion'], update: { marketId: 'a', version: '2' } }, { id: 'b', name: 'B', tools: ['remotion/cards'], update: null }], tools);
    expect(kit.blocks).toHaveLength(4);
    expect(kit.blocks.find((x) => x.ref === 'remotion/cards')!.skills).toEqual(['A', 'B']);
    expect(kit.unused).toEqual([]);
    expect(kit.looks.text).toBeGreaterThan(20);
    expect(kit.updates).toEqual(['A']);
  });
});
