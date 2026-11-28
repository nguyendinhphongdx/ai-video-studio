import { InviteView } from '@/features/auth/InviteView';

export const metadata = { title: 'Lời mời' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return <InviteView token={(await params).token} />;
}
