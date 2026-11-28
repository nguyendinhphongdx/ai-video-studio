import { redirect } from 'next/navigation';

import { episodeService } from '@/server/modules/episode/episode.service';

/** Old episode page: open the episode at production. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const v = await episodeService.get((await params).id).catch(() => null);
  redirect(v ? `/projects/${v.episode.channelId}/episodes/${v.episode.id}/production` : '/');
}
