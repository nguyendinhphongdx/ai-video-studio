'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { MeView } from '@/server/modules/auth/auth.types';

export const meKey = ['auth', 'me'] as const;
export const useMe = () => useQuery({ queryKey: meKey, queryFn: () => api<MeView>('/auth/me'), staleTime: 60_000 });

/** Bottom of the sidebar: the current workspace, who is signed in, and signing out. */
export function AccountBox() {
  const me = useMe().data;
  if (!me) return null;
  return (
    <div className="col" style={{ marginTop: 'auto', gap: 6, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
      {me.workspaces.length > 1 ? (
        <select
          className="select"
          aria-label="Chọn workspace"
          value={me.workspace.id}
          onChange={async (e) => {
            await api('/auth/workspace', { method: 'PUT', body: { workspaceId: e.target.value } });
            // Every screen shows the new workspace's data: start from its home page with fresh queries.
            window.location.assign('/');
          }}
        >
          {me.workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="eyebrow">{me.workspace.name}</span>
      )}
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="cap" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={me.user.email}>
          {me.user.name || me.user.email}
          {me.role === 'owner' ? ' · Chủ' : ' · Thành viên'}
        </span>
        <button
          className="btn sm ghost"
          onClick={async () => {
            await api('/auth/logout', { method: 'POST' });
            window.location.assign('/login');
          }}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
