import { redirect } from 'next/navigation';

/** Merged into the "script" step; kept so old links still work. */
export default async function Page({ params }: { params: Promise<{ id: string; eid: string }> }) {
  const { id, eid } = await params;
  redirect(`/projects/${id}/episodes/${eid}/script`);
}
