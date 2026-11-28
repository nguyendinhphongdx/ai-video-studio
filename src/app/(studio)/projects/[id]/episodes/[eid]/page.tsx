import { redirect } from 'next/navigation';

export default async function EpisodePage({ params }: { params: Promise<{ id: string; eid: string }> }) {
  const { id, eid } = await params;
  redirect(`/projects/${id}/episodes/${eid}/script`);
}
