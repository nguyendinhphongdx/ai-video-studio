import { describe, expect, it } from 'vitest';

import { CHROMA_HEX, EXPRESSIONS, expressionPrompt, missingExpressions } from '@/core/character/expressions';

import { EXPRESSIONS as RIG_EXPRESSIONS } from '../../remotion/puppet/rig';

describe('expression prompts', () => {
  it('lists the same expressions as the puppet rig', () => {
    expect([...EXPRESSIONS]).toEqual([...RIG_EXPRESSIONS]);
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
});
