import { describe, expect, it } from 'vitest';

import { setupPrompt, type SetupKey } from '@/features/v2/lib/setup-prompts';

const KEYS: SetupKey[] = ['general', 'knowledge', 'style', 'skill', 'introArt', 'outroArt'];
const facts = { name: 'Phong Thần', description: '', audience: 'trẻ 6-10 tuổi', imageStyle: '' };

describe('setup requests for the assistant', () => {
  it('asks for one part at a time, names the project, and waits for the person before saving', () => {
    for (const key of KEYS) {
      const { title, prompt } = setupPrompt(key, facts);
      expect(title).toMatch(/^AI /);
      expect(prompt).toContain('"Phong Thần"');
      expect(prompt).toMatch(/đợi tôi đồng ý|ĐỢI TÔI ĐỒNG Ý/);
      expect(prompt).toContain('chỉ làm phần này');
    }
  });

  it('shows what the project has and marks what it lacks', () => {
    const { prompt } = setupPrompt('general', facts);
    expect(prompt).toContain('- Khán giả: trẻ 6-10 tuổi');
    expect(prompt).toContain('- Mô tả: (chưa có)');
  });

  it('never spends money without a go-ahead: pictures state their cost first, style draws nothing', () => {
    expect(setupPrompt('introArt', facts).prompt).toContain('chi phí ước tính');
    expect(setupPrompt('outroArt', facts).prompt).toContain('cảnh kết (outro)');
    expect(setupPrompt('style', facts).prompt).toContain('Không vẽ ảnh nào');
  });
});
