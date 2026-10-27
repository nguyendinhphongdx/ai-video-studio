import { describe, expect, it } from 'vitest';

import { parseSkill, withTools } from '@/core/skills/skill';
import { channelContext, matches, recommendBlocks, recommendSkills } from '@/features/channel/lib/recommend';

const skills = [
  { name: 'Bé học qua thẻ màu', description: 'Video giáo dục thiếu nhi 2-6 tuổi, đếm số, màu sắc', tags: ['kids'] },
  { name: 'Vox style', description: 'Video giải thích điều tra có số liệu', tags: ['vox', 'explainer'] },
];

describe('channel recommendations', () => {
  it('puts the skill that fits what the channel says about itself first', () => {
    const kids = recommendSkills(skills, channelContext({ name: 'Bé vui học', description: 'Dạy trẻ thiếu nhi đếm số và màu sắc', audience: 'trẻ 2-6 tuổi' }));
    expect(kids[0]!.item.name).toBe('Bé học qua thẻ màu');
    expect(kids[0]!.because.length).toBeGreaterThan(0);
    const news = recommendSkills(skills, channelContext({ description: 'Giải thích các vụ điều tra bí ẩn có số liệu' }));
    expect(news[0]!.item.name).toBe('Vox style');
    expect(recommendSkills(skills, '')[0]!.score).toBe(0);
  });

  it('suggests scene types by topic, with accents optional', () => {
    const blocks = [{ ref: 'remotion/ui', name: 'Cửa sổ phần mềm', summary: 'app' }, { ref: 'remotion/chart', name: 'Biểu đồ', summary: 'cột' }];
    expect(recommendBlocks(blocks, 'kenh huong dan phan mem va ung dung')[0]!.item.ref).toBe('remotion/ui');
    expect(recommendBlocks(blocks, 'Thống kê thị trường tài chính')[0]!.item.ref).toBe('remotion/chart');
  });

  it('searches without caring about accents or case', () => {
    expect(matches('THIEU nhi', 'Bé học thiếu nhi')).toBe(true);
    expect(matches('vox cat', 'Vox style')).toBe(false);
    expect(matches('', 'x')).toBe(true);
  });

  it('rewrites only the tool list of a skill', () => {
    const md = '---\nname: X\ndescription: d\ntools: [remotion/picture]\nscenes: 3-5\n---\n\nHướng dẫn giữ nguyên.\n';
    const out = withTools('x', md, ['remotion/picture', 'remotion/kinetic']);
    const back = parseSkill('x', out);
    expect(back.tools).toEqual(['remotion/picture', 'remotion/kinetic']);
    expect(back.body).toBe('Hướng dẫn giữ nguyên.');
    expect(back.scenes).toEqual({ min: 3, max: 5 });
  });
});
