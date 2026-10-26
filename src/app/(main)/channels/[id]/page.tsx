import { ChannelEditView } from '@/features/channel/views/ChannelViews';

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChannelEditView id={id} />;
}
