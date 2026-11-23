import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { lintSkill, parseSkill } from '@/core/skills/skill';
import { toolCatalog } from '@/tools/registry';

const STYLE_IDS = [
  'classic-minimalist', 'modern-studio-tech', 'prehistoric-dark-comedy', 'cozy-storytelling', 'historical-cartoon', 'amber-noir',
  'b1-minimal-handdrawn', 'b2-colorful-handdrawn', 'b3-retro-tv', 'b4-survival-thriller', 'b5-character-explainer', 'b6-dynamic-meme',
];
const load = (id: string) => parseSkill(id, fs.readFileSync(`market/skills/${id}/SKILL.md`, 'utf8'));

describe('market style skills', () => {
  it.each(STYLE_IDS)('%s has a usable picture style, valid tools and an honest "not yet" list', (id) => {
    const skill = load(id);
    const words = skill.imageStyle.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(80);
    expect(words).toBeLessThanOrEqual(160);
    expect(skill.imageStyle).toMatch(/no text/i);
    expect(skill.tools).toContain('remotion/puppet');
    expect(lintSkill(skill, toolCatalog)).toEqual([]);
    expect(skill.body).toContain('Chưa có trong ứng dụng');
    expect(skill.body).toContain('@remotion/puppet');
  });

  it('gives each style its own picture style', () => {
    expect(new Set(STYLE_IDS.map((id) => load(id).imageStyle)).size).toBe(STYLE_IDS.length);
  });
});
