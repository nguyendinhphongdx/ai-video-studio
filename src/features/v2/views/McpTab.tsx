'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { toast } from 'sonner';

import { useMe } from '@/features/auth/AccountBox';
import { mcpApi, mcpKeys, type CreateCodeInput, type McpCodeView } from '@/features/mcp/services/mcp.api';
import { errorMessage } from '@/lib/api/client';

import { Loading } from '../Shell';

type Level = McpCodeView['level'];

const LEVELS: Record<Level, { label: string; hint: string }> = {
  read: { label: 'Chỉ đọc', hint: 'Xem dự án, video, chi phí. Không đổi được gì.' },
  edit: { label: 'Được sửa', hint: 'Xem và sửa nội dung. Không tốn tiền, không xoá, không duyệt video.' },
  full: { label: 'Toàn quyền', hint: 'Làm được cả việc tốn tiền, xoá và duyệt video.' },
};
const EXPIRY = [
  { value: '30', label: '30 ngày' },
  { value: '90', label: '90 ngày' },
  { value: '365', label: '1 năm' },
  { value: '', label: 'Không hết hạn' },
];

const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const copy = (text: string) => void navigator.clipboard.writeText(text).then(() => toast.success('Đã chép'));

/** The ready-to-paste setup of each client. The code is only known right after it is made. */
function setups(url: string, code: string) {
  return [
    { name: 'Claude Code', steps: 'Chạy trong Terminal:', text: `claude mcp add --transport http ai-video-studio ${url} --header "Authorization: Bearer ${code}"` },
    { name: 'Codex', steps: 'Thêm vào ~/.codex/config.toml:', text: `[mcp_servers.ai_video_studio]\nurl = "${url}"\nbearer_token_env_var = "AI_VIDEO_STUDIO_CODE"` },
    { name: 'Codex: biến môi trường', steps: 'Đặt trong shell trước khi mở Codex:', text: `export AI_VIDEO_STUDIO_CODE="${code}"` },
  ];
}

function NewCode({ code }: { code: string }) {
  const url = `${window.location.origin}/api/mcp`;
  return (
    <div className="card" role="status">
      <h2>Mã vừa tạo</h2>
      <span className="cap">Mã chỉ hiện lần này. Chép ngay; mất thì thu hồi và tạo mã khác.</span>
      {setups(url, code).map((s) => (
        <div key={s.name} className="field">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <b>{s.name}</b> <span className="cap">{s.steps}</span>
            </span>
            <button type="button" className="btn sm" onClick={() => copy(s.text)} aria-label={`Chép cách nối ${s.name}`}>
              Chép
            </button>
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12.5 }}>{s.text}</pre>
        </div>
      ))}
    </div>
  );
}

function Calls({ id }: { id: string }) {
  const calls = useQuery({ queryKey: mcpKeys.calls(id), queryFn: () => mcpApi.calls(id) });
  if (calls.isLoading) return <Loading />;
  if (!calls.data?.length) return <span className="cap">Mã này chưa gọi gì.</span>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {calls.data.map((c) => (
        <li key={c.id}>
          <span className="cap">{when(c.at)}</span> {c.summary} <span className="cap">({c.tool})</span>
          {!c.ok && <b> · lỗi</b>}
        </li>
      ))}
    </ul>
  );
}

/** Settings › AI bên ngoài: connection codes that let Claude Code, Codex and other MCP clients work in the studio. */
export function McpTab() {
  const owner = useMe().data?.role === 'owner';
  const qc = useQueryClient();
  const codes = useQuery({ queryKey: mcpKeys.codes, queryFn: mcpApi.codes, enabled: owner });
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Level>('edit');
  const [days, setDays] = useState('90');
  const [made, setMade] = useState('');
  const [open, setOpen] = useState('');

  const refresh = () => void qc.invalidateQueries({ queryKey: mcpKeys.codes });
  const fail = (e: unknown) => toast.error(errorMessage(e));
  const create = useMutation({
    mutationFn: (input: CreateCodeInput) => mcpApi.create(input),
    onSuccess: (r) => {
      setMade(r.code);
      setName('');
      refresh();
    },
    onError: fail,
  });
  const revoke = useMutation({ mutationFn: mcpApi.revoke, onSuccess: () => (refresh(), toast.success('Đã thu hồi mã')), onError: fail });

  if (!owner) return <div className="card">Chỉ chủ workspace mới tạo và quản lý được mã kết nối.</div>;
  return (
    <>
      <div className="card">
        <h2>Kết nối AI bên ngoài</h2>
        <span className="cap">Claude Code, Codex hay công cụ hỗ trợ MCP khác làm việc trong studio bằng một mã kết nối. Mã đụng được mọi dự án của workspace này.</span>
        <form
          className="row"
          style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ name: name.trim(), level, expiresInDays: days ? Number(days) : null });
          }}
        >
          <div className="field grow">
            <label htmlFor="mcp-name">Tên mã</label>
            <input id="mcp-name" className="input" maxLength={60} placeholder="Ví dụ: Claude Code trên máy nhà" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mcp-level">Quyền</label>
            <select id="mcp-level" className="select" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
              {Object.entries(LEVELS).map(([value, l]) => (
                <option key={value} value={value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mcp-days">Hết hạn sau</label>
            <select id="mcp-days" className="select" value={days} onChange={(e) => setDays(e.target.value)}>
              {EXPIRY.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn pri" disabled={!name.trim() || create.isPending}>
            Tạo mã
          </button>
        </form>
        <span className="cap">{LEVELS[level].hint}</span>
        {level === 'full' && (
          <div className="alert warn" role="alert">
            AI bên ngoài sẽ tiêu tiền AI của studio và xoá được dự án, video mà studio không hỏi lại. Chỉ dùng với công cụ bạn tin và đang theo dõi.
          </div>
        )}
      </div>

      {made && <NewCode code={made} />}

      <div className="card">
        <h2>Mã đang có · {codes.data?.length ?? '…'}</h2>
        {codes.isLoading ? (
          <Loading />
        ) : !codes.data?.length ? (
          <span className="cap">Chưa có mã nào.</span>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Quyền</th>
                  <th>Hết hạn</th>
                  <th>Dùng lần cuối</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {codes.data.map((c) => (
                  <Fragment key={c.id}>
                    <tr>
                      <td>
                        <b>{c.name}</b>
                      </td>
                      <td>{LEVELS[c.level].label}</td>
                      <td className="cap">{c.expired ? <b>Đã hết hạn</b> : c.expiresAt ? when(c.expiresAt) : 'Không'}</td>
                      <td className="cap">{c.lastUsedAt ? when(c.lastUsedAt) : 'Chưa dùng'}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn sm ghost" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? '' : c.id)}>
                          Lịch sử
                        </button>
                        <button className="btn sm ghost" onClick={() => window.confirm(`Thu hồi mã “${c.name}”? Công cụ đang dùng mã này sẽ mất kết nối ngay.`) && revoke.mutate(c.id)}>
                          Thu hồi
                        </button>
                      </td>
                    </tr>
                    {open === c.id && (
                      <tr>
                        <td colSpan={5}>
                          <Calls id={c.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
