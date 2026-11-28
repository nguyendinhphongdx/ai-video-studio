import { describe, expect, it } from 'vitest';

import { castForScene, CHROMA_HEX, EXPRESSIONS, expressionPrompt, missingExpressions, POSES, spritesForScene } from '@/core/character/expressions';

import { EXPRESSIONS as RIG_EXPRESSIONS, POSES as RIG_POSES } from '../../remotion/puppet/rig';

describe('expression prompts', () => {
  it('lists the same expressions as the puppet rig', () => {
    expect([...EXPRESSIONS]).toEqual([...RIG_EXPRESSIONS]);
    expect([...POSES]).toEqual([...RIG_POSES]);
  });

  it('asks for a distinct full-body pose per pose sprite', () => {
    const prompts = POSES.map((p) => expressionPrompt(p));
    expect(new Set(prompts).size).toBe(POSES.length);
    for (const p of prompts) expect(p).toContain('in this pose');
    expect(expressionPrompt('walk1')).toContain('towards the right');
    expect(expressionPrompt('walk1')).toContain('ribbons');
  });

  it('draws neutral first when poses are asked for without it', () => {
    expect(missingExpressions({}, ['walk1', 'wave1'])).toEqual(['neutral', 'walk1', 'wave1']);
    expect(missingExpressions({ neutral: 'n.png' }, ['walk1'])).toEqual(['walk1']);
  });

  it('asks for the same character on a flat chroma-key background, with a different look per expression', () => {
    const prompts = EXPRESSIONS.map((e) => expressionPrompt(e));
    for (const p of prompts) {
      expect(p).toContain('exact same character');
      expect(p).toContain(CHROMA_HEX);
      expect(p).toMatch(/no text/);
    }
    expect(new Set(prompts).size).toBe(EXPRESSIONS.length);
    expect(expressionPrompt('blink')).toContain('eyes closed');
  });

  it('plans only the missing expressions, neutral first', () => {
    expect(missingExpressions({})).toEqual([...EXPRESSIONS]);
    expect(missingExpressions({ neutral: 'a.png', happy: 'b.png' })).toEqual(['talk', 'blink', 'angry', 'sad', 'surprised']);
    expect(missingExpressions({ talk: 'x.png' }, ['happy', 'neutral'])).toEqual(['neutral', 'happy']);
    expect(missingExpressions(Object.fromEntries(EXPRESSIONS.map((e) => [e, 'p.png'])))).toEqual([]);
  });

  it('gives each scene only the sprites it can show', () => {
    expect(spritesForScene({ action: 'cross', emotion: 'angry' }).sort()).toEqual(['angry', 'blink', 'cross', 'neutral', 'talk']);
    expect(spritesForScene({ action: 'enter', emotion: 'happy' })).toEqual(expect.arrayContaining(['walk1', 'walk4', 'happy']));
    expect(spritesForScene({ action: 'idle', emotion: 'neutral', pose: 'mua-thuong' })).toContain('pose:mua-thuong');
    expect(castForScene({ companion: 'ngao-binh', item: '' }, { 'ngao-binh': 'a', 'ngao-binh:talk': 'b', 'ly-tinh': 'c' }).sort()).toEqual(['ngao-binh', 'ngao-binh:talk']);
  });
});


describe('a cast character in the main place', () => {
  it('gets its pictures with the scene', () => {
    expect(castForScene({ lead: 'ba-do', companion: '' }, { 'ba-do': 'a', 'ba-do:sad': 'b', other: 'c' }).sort()).toEqual(['ba-do', 'ba-do:sad']);
  });
});
