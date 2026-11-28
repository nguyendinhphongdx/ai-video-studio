import { describe, expect, it } from 'vitest';

import { lineDiff } from '@/features/v2/lib/line-diff';
import { groupVoices, sampleLine } from '@/features/v2/lib/voices';

describe('groupVoices', () => {
  it('groups free Edge voices apart from paid Google ones and splits the label', () => {
    const [edge, google] = groupVoices({ tts: true, ttsGoogle: true });
    expect(edge!.voices.map((v) => v.id)).toEqual(['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural']);
    expect(edge!.voices[0]).toMatchObject({ name: 'Hoài My', gender: 'nữ', free: true, ready: true, reason: null });
    expect(google!.voices.length).toBeGreaterThan(4);
    expect(google!.voices.find((v) => v.id === 'gemini-Charon')).toMatchObject({ gender: 'nam', free: false });
  });

  it('says why a voice cannot play, and claims nothing before the machine is known', () => {
    const [edge, google] = groupVoices({ tts: false, ttsGoogle: false });
    expect(edge!.voices[0]).toMatchObject({ ready: false, reason: expect.stringContaining('edge-tts') });
    expect(google!.voices[0]).toMatchObject({ ready: false, reason: expect.stringContaining('Google API key') });
    expect(groupVoices(undefined).flatMap((g) => g.voices).every((v) => v.ready)).toBe(true);
  });
});

describe('sampleLine', () => {
  it('takes the first sentence of the description, or a greeting when there is none', () => {
    expect(sampleLine('Truyền thuyết Phong Thần kể lại bằng hoạt hình. Dành cho bé.')).toBe('Truyền thuyết Phong Thần kể lại bằng hoạt hình.');
    expect(sampleLine('')).toMatch(/Xin chào/);
  });
});

describe('lineDiff', () => {
  it('lists lines that were added or removed and ignores blank lines and order', () => {
    const d = lineDiff('## A\n\nmột\nhai\nba', '## A\nba\nbốn\nhai');
    expect(d.added).toEqual(['bốn']);
    expect(d.removed).toEqual(['một']);
    expect(lineDiff('x', 'x')).toEqual({ added: [], removed: [] });
  });
});
