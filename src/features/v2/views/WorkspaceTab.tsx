'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { meKey, useMe } from '@/features/auth/AccountBox';
import { api, errorMessage } from '@/lib/api/client';
import type { Role } from '@/server/modules/auth/auth.types';
import type { InviteView, Member } from '@/server/modules/workspace/workspace.types';

import { Loading } from '../Shell';

const ROLE: Record<Role, string> = { owner: 'Chủ', member: 'Thành viên' };
const membersKey = ['workspace', 'members'] as const;
const invitesKey = ['workspace', 'invites'] as const;
const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** Settings › Workspace: its name, who is in it, invite links, and leaving. Owners manage; members see who is in. */
export function WorkspaceTab() {
  const qc = useQueryClient();
  const me = useMe().data;
  const owner = me?.role === 'owner';
  const members = useQuery({ queryKey: membersKey, queryFn: () => api<Member[]>('/workspace/members') });
  const invites = useQuery({ queryKey: invitesKey, queryFn: () => api<InviteView[]>('/workspace/invites'), enabled: owner });
  const [name, setName] = useState('');
  useEffect(() => setName(me?.workspace.name ?? ''), [me?.workspace.name]);
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');

  const fail = (e: unknown) => toast.error(errorMessage(e));
  const rename = useMutation({
    mutationFn: () => api('/workspace', { method: 'PATCH', body: { name } }),
    onSuccess: () => (void qc.invalidateQueries({ queryKey: meKey }), toast.success('Đã đổi tên workspace')),
    onError: fail,
  });
  const invite = useMutation({
    mutationFn: () => api<{ token: string }>('/workspace/invites', { body: { email } }),
    onSuccess: (r) => {
      setLink(`${window.location.origin}/invite/${r.token}`);
      setEmail('');
      void qc.invalidateQueries({ queryKey: invitesKey });
    },
    onError: fail,
  });
  const revoke = useMutation({ mutationFn: (id: string) => api(`/workspace/invites/${id}`, { method: 'DELETE' }), onSuccess: () => void qc.invalidateQueries({ queryKey: invitesKey }), onError: fail });
  const setRole = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => api(`/workspace/members/${v.userId}`, { method: 'PATCH', body: { role: v.role } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: membersKey }),
    onError: fail,
  });
  const remove = useMutation({ mutationFn: (userId: string) => api(`/workspace/members/${userId}`, { method: 'DELETE' }), onSuccess: () => void qc.invalidateQueries({ queryKey: membersKey }), onError: fail });
  const leave = useMutation({ mutationFn: () => api('/workspace/leave', { method: 'POST' }), onSuccess: () => window.location.assign('/'), onError: fail });

  if (!me) return <Loading />;
  return (
    <>
      <div className="card">
        <h2>Workspace</h2>
        <form
          className="row"
          style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && name !== me.workspace.name) rename.mutate();
          }}
        >
          <div className="field grow">
            <label htmlFor="ws-name">Tên workspace</label>
            <input id="ws-name" className="input" maxLength={80} disabled={!owner} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {owner && (
            <button className="btn" disabled={!name.trim() || name === me.workspace.name || rename.isPending}>
              Đổi tên
            </button>
          )}
        </form>
        <span className="cap">Bạn là {ROLE[me.role]} của workspace này. {owner ? 'Chủ quản lý thành viên, khoá AI và ngân sách.' : 'Chỉ chủ mới mời người và quản lý khoá AI, ngân sách.'}</span>
      </div>

      <div className="card">
        <h2>Thành viên · {members.data?.length ?? '…'}</h2>
        {members.isLoading ? (
          <Loading />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Người</th>
                <th>Vai trò</th>
                <th>Tham gia</th>
                {owner && <th aria-label="Thao tác" />}
              </tr>
            </thead>
            <tbody>
              {(members.data ?? []).map((m) => (
                <tr key={m.userId}>
                  <td>
                    <b>{m.name || m.email}</b>
                    {m.userId === me.user.id && <span className="cap"> (bạn)</span>}
                    <div className="cap">{m.email}</div>
                  </td>
                  <td>
                    {owner && m.userId !== me.user.id ? (
                      <select className="select" aria-label={`Vai trò của ${m.name || m.email}`} value={m.role} onChange={(e) => setRole.mutate({ userId: m.userId, role: e.target.value as Role })}>
                        <option value="owner">{ROLE.owner}</option>
                        <option value="member">{ROLE.member}</option>
                      </select>
                    ) : (
                      ROLE[m.role]
                    )}
                  </td>
                  <td className="cap">{day(m.joinedAt)}</td>
                  {owner && (
                    <td style={{ textAlign: 'right' }}>
                      {m.userId !== me.user.id && (
                        <button className="btn sm ghost" onClick={() => window.confirm(`Bỏ ${m.name || m.email} khỏi workspace?`) && remove.mutate(m.userId)}>
                          Bỏ khỏi workspace
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {owner && (
        <div className="card">
          <h2>Mời người vào</h2>
          <form
            className="row"
            style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
          >
            <div className="field grow">
              <label htmlFor="ws-invite">Email người được mời (không bắt buộc)</label>
              <input id="ws-invite" className="input" type="email" placeholder="Để trống: ai có link cũng vào được" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn pri" disabled={invite.isPending}>
              Tạo link mời
            </button>
          </form>
          {link && (
            <div className="alert" role="status">
              <span style={{ flex: 1, wordBreak: 'break-all' }}>{link}</span>
              <button className="btn sm" onClick={() => void navigator.clipboard.writeText(link).then(() => toast.success('Đã chép link'))}>
                Chép link
              </button>
            </div>
          )}
          <span className="cap">Link dùng được một lần, hết hạn sau 7 ngày. Gửi cho người được mời qua chat hoặc email. Nếu có ghi email, chỉ tài khoản đúng email đó mới vào được.</span>
          {(invites.data ?? []).length > 0 && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Lời mời đang chờ</th>
                  <th>Người mời</th>
                  <th>Hết hạn</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {(invites.data ?? []).map((i) => (
                  <tr key={i.id}>
                    <td>{i.email || <span className="cap">Ai có link cũng vào được</span>}</td>
                    <td className="cap">{i.invitedBy}</td>
                    <td className="cap">{day(i.expiresAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn sm ghost" onClick={() => revoke.mutate(i.id)}>
                        Huỷ lời mời
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {me.workspaces.length > 1 && (
        <div className="card">
          <h2>Rời workspace</h2>
          <span className="cap">Bạn sẽ không còn thấy dự án của workspace này. Muốn quay lại cần được mời lại.</span>
          <button className="btn" onClick={() => window.confirm(`Rời “${me.workspace.name}”?`) && leave.mutate()}>
            Rời workspace
          </button>
        </div>
      )}
    </>
  );
}
