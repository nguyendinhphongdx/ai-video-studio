import { describe, expect, it } from 'vitest';

import { copyText, filterTemplates, GROUPS, templateCatalog } from '@/features/templates/lib/catalog';
import { CUT_META } from '@video/shots/cut-meta';
import { ENTRANCE_META } from '@video/shots/entrance-meta';
import { FX_META } from '@video/shots/fx-meta';
import { TEXT_SHOT_META } from '@video/shots/text/meta';
import { MOVES } from '@video/camera/moves';

const blocks = [{ ref: 'remotion/vox', name: 'Vox', summary: 'Cảnh nhiều lớp', defaults: { imagePrompt: 'x' } }, { ref: 'remotion/counter', name: 'Số đếm', summary: 'Đếm lên', defaults: { value: 3 } }];

describe('template library catalog', () => {
  const all = templateCatalog(blocks);
  const of = (g: string) => all.filter((t) => t.group === g);

  it('lists every shot of every library exactly once', () => {
    expect(new Set(all.map((t) => t.key)).size).toBe(all.length);
    expect(of('text').map((t) => t.id)).toEqual(TEXT_SHOT_META.map((m) => m.id));
    expect(of('entrance').map((t) => t.id)).toEqual(ENTRANCE_META.map((m) => m.id));
    expect(of('camera').map((t) => t.id).sort()).toEqual([...MOVES].sort());
    expect(of('fx').map((t) => t.id)).toEqual(FX_META.filter((m) => m.id !== 'none').map((m) => m.id));
    expect(of('cut').map((t) => t.id)).toEqual(CUT_META.filter((m) => m.id !== 'none').map((m) => m.id));
    expect(of('block').map((t) => t.id)).toEqual(['remotion/vox', 'remotion/counter']);
    expect(GROUPS.map((g) => g.id)).toEqual(['text', 'entrance', 'camera', 'fx', 'cut', 'block']);
  });

  it('gives every entry a name, a way to use it and a preview recipe', () => {
    for (const t of all) {
      expect(t.name.trim(), t.key).not.toBe('');
      expect(t.preview.block, t.key).toMatch(/^remotion\//);
      expect(t.copy).toBe(copyText(t.use));
    }
    expect(of('camera')[0]!.copy).toBe('remotion/picture · motion = zoom-in');
    expect(of('block')[0]!.copy).toBe('remotion/vox');
    expect(of('block').map((t) => t.needsImage)).toEqual([true, false]);
  });

  it('previews the multi-line text shots with lines to cycle through', () => {
    for (const m of TEXT_SHOT_META) expect(Boolean(of('text').find((t) => t.id === m.id)!.preview.props.items), m.id).toBe(m.items);
  });

  it('searches names and hints without caring about accents or case', () => {
    expect(filterTemplates(all, 'all', 'GO CHU').some((t) => t.id === 'typewriter')).toBe(true);
    expect(filterTemplates(all, 'fx', '').every((t) => t.group === 'fx')).toBe(true);
    expect(filterTemplates(all, 'all', 'khong co gi nhu the xyz')).toEqual([]);
  });
});
