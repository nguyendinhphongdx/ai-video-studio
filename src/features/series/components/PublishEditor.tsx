'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PublishTemplate } from '@/core/domain';
import { fillTemplate } from '@/core/series/format';

import { SAMPLE_VARS } from '../lib/rules';

import { ListInput } from './ListInput';

const VARS = ['{series}', '{n}', '{topic}', '{title}', '{channel}'];

/** How every episode is titled and described on publish; the AI only adds its own parts. */
export function PublishEditor({ value, onChange }: { value: PublishTemplate; onChange: (v: PublishTemplate) => void }) {
  const set = <K extends keyof PublishTemplate>(key: K, v: PublishTemplate[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pub-title">Mẫu tiêu đề</Label>
        <Input id="pub-title" maxLength={120} value={value.title} onChange={(e) => set('title', e.target.value)} />
        <p className="text-caption text-muted-foreground">
          Biến dùng được: {VARS.join(' ')}. Ví dụ ra: <strong className="text-foreground">{fillTemplate(value.title, SAMPLE_VARS)}</strong>
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pub-tags">Hashtag của series</Label>
        <ListInput id="pub-tags" value={value.hashtags} onChange={(v) => set('hashtags', v)} max={10} placeholder="#tenseries, Enter để thêm" normalize={(s) => (s.trim() && !s.trim().startsWith('#') ? `#${s.trim().replace(/\s+/g, '')}` : s.trim().replace(/\s+/g, ''))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pub-footer">Cuối mô tả (thêm vào mọi tập)</Label>
        <Textarea id="pub-footer" rows={4} maxLength={2000} value={value.descriptionFooter} onChange={(e) => set('descriptionFooter', e.target.value)} placeholder="Ví dụ: Đăng ký kênh để xem tập mới mỗi tuần!" />
      </div>
    </div>
  );
}
