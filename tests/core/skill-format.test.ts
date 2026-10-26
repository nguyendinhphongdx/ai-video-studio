import { describe, expect, it } from 'vitest';

import { activeSlots, fillProps, fillTemplate, lintFormat } from '@/core/series/format';
import { lintSkill, parseSkill } from '@/core/skills/skill';
import { toolCatalog } from '@/tools/registry';

import { seriesFormat } from '../fixtures';

describe('skills', () => {
  const md = `---\nname: Thử\ntools: [remotion/cards, "@remotion/title"]\nscenes: 3-5\n---\nDùng @remotion/cards và @remotion/whiteboard, đừng dùng @veo.`;

  it('parses front matter and normalises refs', () => {
    const s = parseSkill('thu', md);
    expect(s.tools).toEqual(['remotion/cards', 'remotion/title']);
    expect(s.scenes).toEqual({ min: 3, max: 5 });
  });

  it('flags unknown tools as errors and undeclared mentions as warnings', () => {
    const issues = lintSkill(parseSkill('thu', md), toolCatalog);
    expect(issues).toContainEqual({ level: 'error', message: 'Nhắc tới tool không tồn tại: @veo' });
    expect(issues.some((i) => i.level === 'warning' && i.message.includes('@remotion/whiteboard'))).toBe(true);
  });

  it('accepts the shipped skills', async () => {
    const fs = await import('node:fs');
    for (const id of fs.readdirSync('content/skills')) {
      const skill = parseSkill(id, fs.readFileSync(`content/skills/${id}/SKILL.md`, 'utf8'));
      expect(lintSkill(skill, toolCatalog).filter((i) => i.level === 'error')).toEqual([]);
    }
  });
});

describe('episode format', () => {
  it('applies slot conditions per episode number', () => {
    expect(activeSlots(seriesFormat, 1).map((s) => s.id)).toEqual(['intro', 'lesson']);
    expect(activeSlots(seriesFormat, 2).map((s) => s.id)).toEqual(['intro', 'recap', 'lesson']);
  });

  it('fills templates in text and nested props', () => {
    expect(fillTemplate('Tập {n}: {topic} → {next_topic}', { n: '5', topic: 'Số 5', next_topic: 'Số 6' })).toBe('Tập 5: Số 5 → Số 6');
    expect(fillProps({ a: '{n}', b: [{ c: '{series}' }], d: 3 }, { n: '2', series: 'X' })).toEqual({ a: '2', b: [{ c: 'X' }], d: 3 });
  });

  it('lints broken formats', () => {
    const errors = lintFormat({ durationSec: null, slots: [{ id: 'a', name: 'A', fill: 'locked', when: 'always', blocks: [], scenes: { min: 1, max: 1 }, guide: '' }, { id: 'a', name: 'B', fill: 'ai', when: 'always', blocks: [], scenes: { min: 3, max: 1 }, guide: '' }] });
    expect(errors).toHaveLength(4);
  });
});
