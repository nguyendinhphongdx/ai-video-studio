'use client';

import Link from 'next/link';

import { ROUTES } from '@/constants/routes';
import { useSkills, useTools } from '@/features/episode/hooks/use-episode';
import { UpgradeSkillButton } from '@/features/skill/components/UpgradeSkillButton';

import { channelToolkit } from '../lib/toolkit';

const LOOK_LABEL = { text: 'kiểu chữ chuyển động', entrance: 'cách mở cảnh', camera: 'chuyển động camera', fx: 'hiệu ứng ánh sáng', cut: 'kiểu cắt nhịp' } as const;

/** What the AI can use when it writes a video for this channel, so nobody has to open each skill to find out. */
export function ChannelToolkit({ channelId }: { channelId: string }) {
  const { data: skills } = useSkills(channelId);
  const { data: tools } = useTools();
  if (!skills || !tools) return null;
  const kit = channelToolkit(skills.filter((s) => !s.issues.some((i) => i.level === 'error')), tools);
  return (
    <section aria-labelledby="kit-h" className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
      <div>
        <h2 id="kit-h" className="text-title font-bold">
          AI đang dùng những mẫu nào
        </h2>
        <p className="text-small text-muted-foreground">Khi tạo video, AI tự chọn và đổi luân phiên trong những mẫu dưới đây, bạn không cần cài đặt thêm. Nhiều loại cảnh hơn thì video đa dạng hơn.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {kit.blocks.map((b) => (
          <span key={b.ref} title={`Skill: ${b.skills.join(', ')}`} className="rounded-full bg-accent px-3 py-1 text-small font-semibold text-accent-foreground">
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
      {kit.unused.length ? (
        <p className="text-small text-muted-foreground">
          Chưa dùng: {kit.unused.map((b) => b.name).join(', ')}. Cài thêm kiểu video có các loại cảnh này, hoặc nhờ trợ lý thêm vào skill của kênh.
        </p>
      ) : null}
      {kit.updates.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-warning-soft px-3 py-2 text-small text-warning">
          <span>Có bản mới của: {kit.updates.join(', ')} (thêm mẫu mới).</span>
          {skills.filter((s) => s.update).map((s) => (
            <UpgradeSkillButton key={s.id} channelId={channelId} skillId={s.id} />
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3 text-small font-semibold">
        <Link href={ROUTES.templates} className="text-primary hover:underline">
          Xem mọi mẫu chạy thật
        </Link>
        <Link href={ROUTES.skills} className="text-primary hover:underline">
          Kiểu video của kênh
        </Link>
      </div>
    </section>
  );
}
