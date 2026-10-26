import { ScriptView } from '@/features/episode/views/EpisodeViews';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScriptView id={id} />;
}
