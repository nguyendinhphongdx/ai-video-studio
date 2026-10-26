import { describe, expect, it } from 'vitest';

import { createToolCatalog } from '@/core/tools/catalog';
import { mentionsIn } from '@/core/tools/mention';
import { toolCatalog } from '@/tools/registry';
import { REMOTION_VERSION, remotionTool } from '@/tools/remotion/tool';

describe('tool catalog', () => {
  it('expands a tool mention into all its blocks', () => {
    const { blocks, unknown } = toolCatalog.resolve(['remotion']);
    expect(unknown).toEqual([]);
    expect(blocks.map((b) => b.ref)).toEqual(['remotion/title', 'remotion/cards', 'remotion/whiteboard', 'remotion/recap', 'remotion/quiz', 'remotion/picture', 'remotion/vox', 'remotion/outro']);
  });

  it('resolves single blocks, accepts "@" and reports unknown refs', () => {
    const { blocks, unknown } = toolCatalog.resolve(['@remotion/cards', 'hyperframes/cards', 'veo/clip', 'nope']);
    expect(blocks.map((b) => b.ref)).toEqual(['remotion/cards', 'hyperframes/cards']);
    expect(unknown).toEqual(['veo/clip', 'nope']);
  });

  it('rejects duplicate tools', () => {
    expect(() => createToolCatalog([remotionTool, remotionTool])).toThrow(/Duplicate tool/);
  });

  it('finds tool and block mentions in text', () => {
    expect(mentionsIn('Mở bằng @remotion/title, rồi (@remotion) và email a@b.com')).toEqual(['remotion/title', 'remotion']);
  });

  it('declares the installed Remotion version', async () => {
    const fs = await import('node:fs');
    expect(REMOTION_VERSION).toBe(JSON.parse(fs.readFileSync('node_modules/remotion/package.json', 'utf8')).version);
  });

  it('every block has editor fields that exist in its defaults', () => {
    for (const tool of toolCatalog.tools()) {
      for (const block of tool.blocks) {
        expect(() => block.props.parse(block.defaults)).not.toThrow();
        for (const f of block.fields) expect(Object.keys(block.defaults as object)).toContain(f.key);
      }
    }
  });
});
