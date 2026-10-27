'use client';

import Link from 'next/link';

import { ROUTES } from '@/constants/routes';
import { useCurrentChannel } from '@/features/app';

import { CreateVideoForm } from '../components/CreateVideoForm';
import { EpisodeGrid } from '../components/EpisodeCard';
import { useEpisodes, useTools } from '../hooks/use-episode';

export function HomeView() {
  const { current } = useCurrentChannel();
  const { data: episodes } = useEpisodes(current?.id);
  const { data: tools } = useTools();
  const inProgress = (episodes ?? []).filter((v) => v.episode.status !== 'published').slice(0, 8);
  return (
    <div className="flex flex-col gap-10">
      <CreateVideoForm />
      <section aria-labelledby="wip-h" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="wip-h" className="text-h3 font-bold">
            Đang làm dở
          </h2>
          <Link href={ROUTES.library} className="text-small font-semibold text-primary hover:underline">
            Xem tất cả video
          </Link>
        </div>
        <EpisodeGrid views={inProgress} tools={tools} channel={current} empty="Chưa có video nào đang làm. Gõ ý tưởng đầu tiên ở trên nhé!" />
      </section>
    </div>
  );
}
