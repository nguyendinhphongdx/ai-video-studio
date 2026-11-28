'use client';

import { Check } from 'lucide-react';

import { AskAiButton } from '@/features/assistant/components/AskAiButton';

import { setupPrompt } from '../../lib/setup-prompts';
import type { FormProps } from './sections';

const Count = ({ value, max }: { value: string; max: number }) => (
  <span className="cap" style={{ alignSelf: 'flex-end' }}>
    {value.length}/{max}
  </span>
);

/** Who the project is for and how it sounds: what the AI reads before writing anything. */
export function GeneralSection({ form, set }: FormProps) {
  const missing = [!form.description.trim() && 'mô tả', !form.audience.trim() && 'khán giả', !form.style.trim() && 'giọng văn'].filter(Boolean) as string[];
  const facts = { name: form.name, description: form.description, audience: form.audience, imageStyle: form.imageStyle };
  return (
    <section className="card" aria-labelledby="s-general">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 id="s-general">Thông tin chung</h2>
        {missing.length ? (
          <div className="row">
            <span className="chip warn">Thiếu {missing.join(', ')}</span>
            <AskAiButton label="AI làm" {...setupPrompt('general', facts)} />
          </div>
        ) : (
          <span className="chip ok">
            <Check size={12} aria-hidden /> Đủ thông tin
          </span>
        )}
      </div>
      <p className="muted">AI đọc phần này trước khi viết bất cứ gì cho dự án. Viết càng cụ thể, kịch bản càng đúng ý.</p>
      <div className="field">
        <label htmlFor="ps-name">Tên dự án</label>
        <input id="ps-name" className="input" maxLength={60} value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ps-desc">Dự án nói về gì</label>
        <textarea id="ps-desc" className="area" rows={4} maxLength={500} value={form.description} onChange={(e) => set('description', e.target.value)} />
        <Count value={form.description} max={500} />
      </div>
      <div className="field">
        <label htmlFor="ps-aud">Khán giả</label>
        <input id="ps-aud" className="input" maxLength={300} value={form.audience} onChange={(e) => set('audience', e.target.value)} />
        <span className="hint">Độ tuổi, sở thích, họ đã biết gì. AI viết cho đúng những người này.</span>
      </div>
      <div className="field">
        <label htmlFor="ps-style">Giọng văn</label>
        <textarea id="ps-style" className="area" rows={3} maxLength={500} value={form.style} onChange={(e) => set('style', e.target.value)} />
        <Count value={form.style} max={500} />
      </div>
      <div className="field">
        <label htmlFor="ps-tags">Hashtag</label>
        <input id="ps-tags" className="input" value={form.hashtags.join(' ')} onChange={(e) => set('hashtags', e.target.value.split(/\s+/).filter(Boolean).slice(0, 10))} />
        <span className="hint">Cách nhau bằng dấu cách, tối đa 10, mỗi cái bắt đầu bằng #.</span>
        {form.hashtags.length > 0 && (
          <div className="row" style={{ gap: 6 }}>
            {form.hashtags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
