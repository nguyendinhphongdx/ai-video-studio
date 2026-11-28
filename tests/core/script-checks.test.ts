import { describe, expect, it } from 'vitest';

import type { QualityInput } from '@/core/quality/check';
import { QUALITY_CHECKS } from '@/core/quality/checks';

const check = (id: string) => QUALITY_CHECKS.find((c) => c.id === id)!;
const scene = (id: string, props: Record<string, unknown>) => ({ id, block: 'remotion/puppet', locked: false, narration: 'x', props });
const input = (scenes: unknown[], bible: unknown) => ({ scenes, bible }) as unknown as QualityInput;

describe('automatic script checks', () => {
  it('flags characters, props and poses that have no picture', () => {
    const bible = { characterCast: { 'ly-tinh': 'a.png', 'ly-tinh:talk': 'b.png' }, characterSprites: { 'pose:mua-thuong': 'c.png' } };
    const issues = check('cast-refs').run(input([scene('1', { lead: 'ly-tinh', pose: 'mua-thuong', companion: '', item: '' }), scene('2', { lead: '', companion: 'ba-do', item: '', pose: 'bay' })], bible));
    expect(issues.map((i) => i.sceneId)).toEqual(['2', '2']);
  });

  it('flags empty or Vietnamese picture prompts', () => {
    const issues = check('picture-prompts').run(input([scene('1', { imagePrompt: '' }), scene('2', { imagePrompt: 'một ngôi đền' }), scene('3', { imagePrompt: 'an old temple' }), scene('4', {})], null));
    expect(issues.map((i) => i.sceneId)).toEqual(['1', '2']);
  });
});

describe('drawn shows', () => {
  it('rejects a text-only scene, but leaves shows without a character library alone', () => {
    const tools = { block: (ref: string) => (ref === 'remotion/picture' ? { image: {} } : {}) };
    const scenes = [{ id: '1', block: 'remotion/picture', locked: false }, { id: '2', block: 'remotion/kinetic', locked: false }, { id: '3', block: 'remotion/outro', locked: true }];
    const run = (characterAssets: string[]) => check('drawn-scenes').run({ scenes, tools, bible: { characterAssets } } as unknown as QualityInput);
    expect(run(['hero.png']).map((i) => i.sceneId)).toEqual(['2']);
    expect(run([])).toEqual([]);
  });
});
