import { describe, expect, it } from 'vitest';

import { characterRefs, imageSpec, imageStyleOf } from '@/core/scenes/assets';
import type { Scene } from '@/core/domain/episode';
import type { ToolCatalog } from '@/core/tools/catalog';

const base = { skill: { imageStyle: '' }, channel: { imageStyle: 'flat ink style' } };
const withBible = (characterAssets: string[], characters = '') => ({ ...base, series: { version: { bible: { characterAssets, characters } } } });

describe('character references', () => {
  it('leaves the style untouched when the series has no character pictures', () => {
    expect(imageStyleOf(base)).toBe('flat ink style');
    expect(imageStyleOf(withBible([]))).toBe('flat ink style');
    expect(characterRefs({})).toEqual([]);
  });

  it('adds the keep-the-character rule and the notes when pictures exist', () => {
    const style = imageStyleOf(withBible(['series-characters/character-a.png'], 'Na Tra: red robe'));
    expect(style).toContain('flat ink style');
    expect(style).toContain('exactly as in the attached reference images');
    expect(style).toContain('Na Tra: red robe');
    expect(characterRefs(withBible(['x/y.png']))).toEqual(['x/y.png']);
  });

  it('changes the style (so every picture hash) when a reference picture is replaced', () => {
    expect(imageStyleOf(withBible(['series-characters/character-a.png']))).not.toBe(imageStyleOf(withBible(['series-characters/character-b.png'])));
  });

  it('does not tell a background-only block to draw the characters', () => {
    const style = imageStyleOf(withBible(['series-characters/character-a.png'], 'Na Tra: red robe'));
    const scene = { block: 'remotion/puppet', props: { imagePrompt: 'an empty courtyard' } } as unknown as Scene;
    const catalog = (background: boolean) => ({ block: () => ({ image: { promptKey: 'imagePrompt', style: '', background } }) }) as unknown as ToolCatalog;
    expect(imageSpec(scene, catalog(true), style)!.prompt).not.toContain('reference images');
    expect(imageSpec(scene, catalog(false), style)!.prompt).toContain('reference images');
    // The last words forbid people even when the skill's own style talks about characters.
    expect(imageSpec(scene, catalog(true), style)!.prompt.endsWith('scenery and objects only.')).toBe(true);
    expect(imageSpec(scene, catalog(false), style)!.prompt).not.toContain('empty background plate');
  });
});
