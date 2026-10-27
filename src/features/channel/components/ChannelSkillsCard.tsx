'use client';

import { Layers, Plus, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useSkills, useTools } from '@/features/episode/hooks/use-episode';
import { UpgradeSkillButton } from '@/features/skill/components/UpgradeSkillButton';
import { cn } from '@/lib/utils';
import type { SceneBrand } from '@video/primitives';

import { channelToolkit } from '../lib/toolkit';
import { SceneTypePickerDialog } from './SceneTypePickerDialog';
import { SkillPickerDialog } from './SkillPickerDialog';

const LOOK_LABEL = { text: 'kiểu chữ chuyển động', entrance: 'cách mở cảnh', camera: 'chuyển động camera', fx: 'hiệu ứng ánh sáng', cut: 'kiểu cắt nhịp' } as const;

interface Props {
  channelId: string;
  /** The channel's default video style (part of the unsaved form). */
  defaultSkillId: string | null;
  onDefault: (skillId: string) => void;
  brand: SceneBrand;
  context: string;
}

/** Everything about how this channel's videos are made: the styles it has, which is the default, which scene types the AI may use. */
export function ChannelSkillsCard({ channelId, defaultSkillId, onDefault, brand, context }: Props) {
  const { data: skills } = useSkills(channelId);
  const { data: tools } = useTools();
  const [pickSkill, setPickSkill] = useState(false);
  const [pickScenes, setPickScenes] = useState(false);
  if (!skills || !tools) return null;
  const usable = skills.filter((s) => !s.issues.some((i) => i.level === 'error'));
  const kit = channelToolkit(usable, tools);
  return (
    <section aria-labelledby="kit-h" className="flex flex-col gap-5 rounded-2xl border bg-card p-6">
      <div>
        <h2 id="kit-h" className="text-title font-bold">
          Kiểu video và mẫu của kênh
        </h2>
        <p className="text-small text-muted-foreground">Mặc định đã đủ dùng: khi tạo video, AI tự chọn và đổi luân phiên trong các mẫu bên dưới. Thêm kiểu hoặc loại cảnh khi bạn muốn video đa dạng hơn.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPickSkill(true)}>
          <Plus aria-hidden />
          Thêm kiểu video
        </Button>
        <Button variant="outline" onClick={() => setPickScenes(true)}>
          <Layers aria-hidden />
          Chọn loại cảnh AI được dùng
        </Button>
      </div>

      <ul className="flex flex-col gap-2" aria-label="Kiểu video của kênh">
        {skills.map((s) => {
          const isDefault = defaultSkillId === s.id;
          return (
            <li key={s.id} className={cn('flex flex-wrap items-center gap-3 rounded-xl border p-3', isDefault && 'border-primary bg-accent/30')}>
              <button type="button" aria-pressed={isDefault} aria-label={isDefault ? `${s.name} là kiểu mặc định` : `Đặt ${s.name} làm kiểu mặc định`} onClick={() => onDefault(s.id)} className={cn('grid size-9 place-items-center rounded-full', isDefault ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent')}>
                <Star className="size-4" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <Link href={`${ROUTES.skills}/${s.id}`} className="font-bold hover:underline">
                  {s.name}
                </Link>
                <p className="text-caption text-muted-foreground">
                  {isDefault ? 'Mặc định của kênh · ' : ''}
                  {s.tools.length} loại cảnh · {s.scenes.min}–{s.scenes.max} cảnh
                </p>
              </div>
              {s.update ? <UpgradeSkillButton channelId={channelId} skillId={s.id} /> : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4">
        <h3 className="text-small font-bold">AI đang được dùng</h3>
        <div className="flex flex-wrap gap-2">
          {kit.blocks.map((b) => (
            <span key={b.ref} title={`Kiểu video: ${b.skills.join(', ')}`} className="rounded-full bg-accent px-3 py-1 text-small font-semibold text-accent-foreground">
              {b.name}
            </span>
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-small text-slate-700">
          {(Object.keys(kit.looks) as (keyof typeof LOOK_LABEL)[]).map((g) => (
            <li key={g}>
              <span className="font-semibold">{kit.looks[g]}</span> {LOOK_LABEL[g]}
            </li>
          ))}
        </ul>
        {kit.unused.length ? <p className="text-small text-muted-foreground">Chưa dùng: {kit.unused.map((b) => b.name).join(', ')}.</p> : null}
        <Link href={ROUTES.templates} className="w-fit text-small font-semibold text-primary hover:underline">
          Xem mọi mẫu chạy thật
        </Link>
      </div>

      <SkillPickerDialog open={pickSkill} onOpenChange={setPickSkill} channelId={channelId} brand={brand} context={context} />
      <SceneTypePickerDialog open={pickScenes} onOpenChange={setPickScenes} channelId={channelId} skills={usable} defaultSkillId={defaultSkillId} brand={brand} context={context} />
    </section>
  );
}
