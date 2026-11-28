'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LogoMark } from '@/components/brand/LogoMark';
import { api, errorMessage } from '@/lib/api/client';
import type { MeView } from '@/server/modules/auth/auth.types';
import type { InvitePreview } from '@/server/modules/workspace/workspace.types';

/** An invite link: who invites you where; sign up or sign in, then join. */
export function InviteView({ token }: { token: string }) {
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [me, setMe] = useState<MeView | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const here = `/invite/${encodeURIComponent(token)}`;

  useEffect(() => {
    api<InvitePreview>(`/invites/${encodeURIComponent(token)}`).then(setInvite, (e) => setError(errorMessage(e)));
    api<MeView>('/auth/me').then(setMe, () => setMe(null));
  }, [token]);

  const join = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' });
      window.location.assign('/');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const already = Boolean(me && invite && me.workspaces.some((w) => w.id === invite.workspaceId));
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div className="row" style={{ gap: 10 }}>
          <LogoMark size={32} title="AI Video Studio" />
          <b style={{ fontSize: 18 }}>Video Studio</b>
        </div>
        {!invite && !error && <p className="cap">Đang mở lời mời…</p>}
        {invite && (
          <div>
            <h1 style={{ fontSize: 22, margin: '8px 0 4px' }}>Lời mời vào “{invite.workspaceName}”</h1>
            <p className="cap">
              {invite.invitedBy ? `${invite.invitedBy} mời bạn cùng làm video trong workspace này.` : 'Bạn được mời cùng làm video trong workspace này.'}
              {invite.email && ` Lời mời dành cho ${invite.email}.`}
            </p>
          </div>
        )}
        {already && <div className="alert">Bạn đã ở trong workspace này.</div>}
        {!already && invite?.state === 'used' && <div className="alert">Lời mời này đã được dùng.</div>}
        {invite?.state === 'expired' && <div className="alert">Lời mời đã hết hạn. Nhờ chủ workspace gửi lời mời mới.</div>}
        {error && (
          <div className="alert bad" role="alert">
            {error}
          </div>
        )}
        {invite?.state === 'open' && me && !already && (
          <>
            <p className="cap">
              Bạn đang đăng nhập là <b>{me.user.email}</b>.
            </p>
            <button className="btn pri" disabled={busy} onClick={() => void join()}>
              {busy ? 'Đang tham gia…' : 'Tham gia workspace'}
            </button>
          </>
        )}
        {invite?.state === 'open' && me === null && (
          <div className="col" style={{ gap: 8 }}>
            <Link className="btn pri" href={`/signup?next=${encodeURIComponent(here)}`}>
              Tạo tài khoản để tham gia
            </Link>
            <Link className="btn" href={`/login?next=${encodeURIComponent(here)}`}>
              Tôi đã có tài khoản
            </Link>
          </div>
        )}
        {invite && (invite.state !== 'open' || already) && <Link href="/">Về trang chủ</Link>}
      </div>
    </main>
  );
}
