import { redirect } from 'next/navigation';

import { seriesService } from '@/server/modules/series/series.service';

/** Old series page: characters now live in the project library. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const series = await seriesService.get((await params).id).catch(() => null);
  redirect(series ? `/projects/${series.channelId}/library` : '/');
}
