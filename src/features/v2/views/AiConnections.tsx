'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { queryKeys, useAppConfig } from '@/features/app';
import { useMe } from '@/features/auth/AccountBox';
import { settingsApi } from '@/features/settings/services/settings.service';
import { api, errorMessage } from '@/lib/api/client';
import { EFFORTS, IMAGE_PROVIDERS, IMAGE_PROVIDER_IDS, PROVIDERS, PROVIDER_IDS, type Effort, type ImageProviderId, type ImageSettingsInput, type LlmSettingsInput, type ProviderId, type PublicImageSettings, type PublicLlmSettings } from '@/server/modules/settings/settings.types';

type Result = { ok: true; model: string } | { ok: false; error: string } | null;

/** Which connection a card edits: the current workspace's own, or the system's shared one (admin). */
type Level = 'workspace' | 'shared';
const sharedApi = {
  llm: () => api<PublicLlmSettings>('/settings/shared/llm'),
  saveLlm: (input: LlmSettingsInput) => api<PublicLlmSettings>('/settings/shared/llm', { method: 'PUT', body: input }),
  image: () => api<PublicImageSettings>('/settings/shared/image'),
  saveImage: (input: ImageSettingsInput) => api<PublicImageSettings>('/settings/shared/image', { method: 'PUT', body: input }),
};
const apiFor = (level: Level) => (level === 'shared' ? { ...settingsApi, ...sharedApi } : settingsApi);
const keyFor = (level: Level, what: 'llm' | 'image') => (level === 'shared' ? ['settings', 'shared', what] : what === 'llm' ? queryKeys.llmSettings : ['settings', 'image']);

function StatusChip({ ready, source }: { ready: boolean; source: string | null }) {
  const from = source === 'env' ? ' · từ biến môi trường' : source === 'llm' ? ' · dùng chung key viết kịch bản' : '';
  return ready ? (
    <span className="chip ok">
      <i />
      Đã kết nối{from}
    </span>
  ) : (
    <span className="chip warn">
      <i />
      Chưa kết nối
    </span>
  );
}

function TestResult({ r }: { r: Result }) {
  if (!r) return null;
  return r.ok ? <div className="alert ok">Kết nối được · {r.model}</div> : <div className="alert bad">{r.error}</div>;
}

/** Writing (LLM): provider, model, key, server address and effort; test before saving. */
function LlmCard({ level = 'workspace' }: { level?: Level }) {
  const qc = useQueryClient();
  const sapi = apiFor(level);
  const saved = useQuery({ queryKey: keyFor(level, 'llm'), queryFn: sapi.llm }).data;
  const [form, setForm] = useState<{ provider: ProviderId; model: string; apiKey: string; baseUrl: string; effort: Effort } | null>(null);
  const [result, setResult] = useState<Result>(null);
  useEffect(() => {
    if (saved) setForm({ provider: saved.provider, model: saved.model, apiKey: '', baseUrl: saved.baseUrl, effort: saved.effort });
  }, [saved]);
  // The key is only sent when the person typed a new one; an empty box keeps the stored key.
  const input = () => form && { provider: form.provider, model: form.model, baseUrl: form.baseUrl, effort: form.effort, ...(form.apiKey ? { apiKey: form.apiKey } : {}) };
  const test = useMutation({ mutationFn: () => settingsApi.testLlm(input()!), onSuccess: setResult, onError: (e) => setResult({ ok: false, error: errorMessage(e) }) });
  const save = useMutation({
    mutationFn: (extra: { clearKey?: boolean } = {}) => sapi.saveLlm({ ...input()!, ...extra }),
    onSuccess: (d) => {
      qc.setQueryData(keyFor(level, 'llm'), d);
      void qc.invalidateQueries({ queryKey: queryKeys.config });
      toast.success('Đã lưu kết nối viết kịch bản');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!saved || !form) return <div className="card flat cap">Đang tải…</div>;
  const preset = PROVIDERS[form.provider];
  const set = (p: Partial<typeof form>) => (setForm({ ...form, ...p }), setResult(null));
  const custom = form.provider === 'openai-compatible';

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <span className="eyebrow">Viết kịch bản, trợ lý Đạo diễn</span>
          <h2>Mô hình ngôn ngữ</h2>
        </div>
        <StatusChip ready={saved.ready} source={saved.keySource} />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="llm-p">Nhà cung cấp</label>
          <select
            id="llm-p"
            className="select"
            value={form.provider}
            onChange={(e) => {
              const p = e.target.value as ProviderId;
              set({ provider: p, model: p === saved.provider ? saved.model : PROVIDERS[p].defaultModel, baseUrl: p === saved.provider ? saved.baseUrl : PROVIDERS[p].baseUrl, apiKey: '' });
            }}
          >
            {PROVIDER_IDS.map((p) => (
              <option key={p} value={p}>
                {PROVIDERS[p].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="llm-m">Mô hình</label>
          <input id="llm-m" className="input mono" list="llm-models" value={form.model} onChange={(e) => set({ model: e.target.value })} />
          <datalist id="llm-models">
            {preset.models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="llm-k">API key</label>
          <input id="llm-k" className="input mono" type="password" autoComplete="off" value={form.apiKey} placeholder={saved.hasKey && form.provider === saved.provider ? saved.apiKey : preset.needsKey ? 'Dán API key vào đây' : 'Để trống nếu máy chủ không cần'} onChange={(e) => set({ apiKey: e.target.value })} />
          <span className="hint">
            {saved.keySource === 'env' ? `Đang dùng ${preset.envKey} từ biến môi trường. ` : ''}
            {preset.keyUrl && (
              <a href={preset.keyUrl} target="_blank" rel="noreferrer">
                Lấy key
              </a>
            )}
          </span>
        </div>
        <div className="field">
          <label>Mức suy nghĩ</label>
          <div className="seg" style={{ alignSelf: 'flex-start' }}>
            {EFFORTS.map((e) => (
              <button key={e} className={form.effort === e ? 'on' : undefined} onClick={() => set({ effort: e })}>
                {e === 'low' ? 'Nhanh' : e === 'medium' ? 'Vừa' : 'Kỹ'}
              </button>
            ))}
          </div>
          <span className="hint">Kỹ hơn thì kịch bản tốt hơn nhưng chậm và tốn hơn.</span>
        </div>
        {(custom || form.baseUrl) && (
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="llm-u">Địa chỉ máy chủ</label>
            <input id="llm-u" className="input mono" value={form.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} />
          </div>
        )}
      </div>
      <TestResult r={result} />
      <div className="row">
        {level === 'workspace' && (
          <button className="btn" disabled={test.isPending} onClick={() => test.mutate()}>
            {test.isPending ? 'Đang thử…' : 'Thử kết nối'}
          </button>
        )}
        <button className="btn pri" disabled={save.isPending} onClick={() => save.mutate({})}>
          Lưu
        </button>
        {saved.keySource === 'settings' && (
          <button className="btn ghost" disabled={save.isPending} onClick={() => confirm('Xoá API key đã lưu?') && save.mutate({ clearKey: true })}>
            Xoá key đã lưu
          </button>
        )}
      </div>
    </div>
  );
}

/** Pictures: provider, model and key (may reuse the writing key of the same provider). */
function ImageCard({ level = 'workspace' }: { level?: Level }) {
  const qc = useQueryClient();
  const sapi = apiFor(level);
  const saved = useQuery({ queryKey: keyFor(level, 'image'), queryFn: sapi.image }).data;
  const [form, setForm] = useState<{ provider: ImageProviderId; model: string; apiKey: string } | null>(null);
  const [result, setResult] = useState<Result>(null);
  useEffect(() => {
    if (saved) setForm({ provider: saved.provider, model: saved.model, apiKey: '' });
  }, [saved]);
  const input = () => form && { provider: form.provider, model: form.model, ...(form.apiKey ? { apiKey: form.apiKey } : {}) };
  const test = useMutation({
    mutationFn: () => settingsApi.testImage(input()!),
    onSuccess: (r) => setResult(r.ok ? { ok: true, model: r.model } : r),
    onError: (e) => setResult({ ok: false, error: errorMessage(e) }),
  });
  const save = useMutation({
    mutationFn: (extra: { clearKey?: boolean } = {}) => sapi.saveImage({ ...input()!, ...extra }),
    onSuccess: (d) => {
      qc.setQueryData(keyFor(level, 'image'), d);
      void qc.invalidateQueries({ queryKey: queryKeys.config });
      toast.success('Đã lưu kết nối vẽ ảnh');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!saved || !form) return <div className="card flat cap">Đang tải…</div>;
  const preset = IMAGE_PROVIDERS[form.provider];
  const set = (p: Partial<typeof form>) => (setForm({ ...form, ...p }), setResult(null));

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <span className="eyebrow">Ảnh nền, nhân vật, ảnh bìa</span>
          <h2>Vẽ ảnh</h2>
        </div>
        <StatusChip ready={saved.ready} source={saved.keySource} />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="img-p">Nhà cung cấp</label>
          <select id="img-p" className="select" value={form.provider} onChange={(e) => set({ provider: e.target.value as ImageProviderId, model: IMAGE_PROVIDERS[e.target.value as ImageProviderId].defaultModel, apiKey: '' })}>
            {IMAGE_PROVIDER_IDS.map((p) => (
              <option key={p} value={p}>
                {IMAGE_PROVIDERS[p].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="img-m">Mô hình</label>
          <select id="img-m" className="select mono" value={form.model} onChange={(e) => set({ model: e.target.value })}>
            {[...new Set<string>([...preset.models, form.model])].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="img-k">API key</label>
          <input id="img-k" className="input mono" type="password" autoComplete="off" value={form.apiKey} placeholder={saved.hasKey ? saved.apiKey : 'Để trống để dùng chung key viết kịch bản cùng nhà cung cấp'} onChange={(e) => set({ apiKey: e.target.value })} />
          <span className="hint">
            <a href={preset.keyUrl} target="_blank" rel="noreferrer">
              Lấy key
            </a>
          </span>
        </div>
      </div>
      <TestResult r={result} />
      <div className="row">
        {level === 'workspace' && (
          <button className="btn" disabled={test.isPending} onClick={() => test.mutate()} title="Vẽ thử một ảnh nhỏ, có tốn một ít phí">
            {test.isPending ? 'Đang vẽ thử…' : 'Vẽ thử một ảnh'}
          </button>
        )}
        <button className="btn pri" disabled={save.isPending} onClick={() => save.mutate({})}>
          Lưu
        </button>
        {saved.keySource === 'settings' && (
          <button className="btn ghost" disabled={save.isPending} onClick={() => confirm('Xoá API key đã lưu?') && save.mutate({ clearKey: true })}>
            Xoá key đã lưu
          </button>
        )}
      </div>
    </div>
  );
}

/** Voices and sound effects: listen to a voice, switch effects on and off. */
function VoiceCard() {
  const qc = useQueryClient();
  const config = useAppConfig().data;
  const sfx = useQuery({ queryKey: ['settings', 'sfx'], queryFn: settingsApi.sfx }).data;
  const saveSfx = useMutation({ mutationFn: settingsApi.saveSfx, onSuccess: (d) => qc.setQueryData(['settings', 'sfx'], d), onError: (e) => toast.error(errorMessage(e)) });
  const voices = Object.entries(config?.voices ?? {});
  const [voice, setVoice] = useState('vi-VN-HoaiMyNeural');
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const play = async () => {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    try {
      const { url } = await settingsApi.previewVoice('Xin chào! Đây là giọng đọc cho video của bạn.', voice);
      audio.current = new Audio(url);
      audio.current.onended = () => setPlaying(false);
      await audio.current.play();
    } catch (e) {
      setPlaying(false);
      toast.error(errorMessage(e));
    }
  };
  return (
    <div className="card">
      <div>
        <span className="eyebrow">Lời đọc và âm thanh</span>
        <h2>Giọng đọc và hiệu ứng</h2>
      </div>
      <div className="field">
        <label htmlFor="tts-v">Nghe thử giọng</label>
        <div className="row">
          <select id="tts-v" className="select grow" value={voice} onChange={(e) => setVoice(e.target.value)}>
            {voices.map(([id, label]) => (
              <option key={id} value={id}>
                {String(label)}
              </option>
            ))}
          </select>
          <button className="btn" onClick={play}>
            {playing ? 'Dừng' : '▶ Nghe'}
          </button>
        </div>
        <span className="hint">Giọng Edge miễn phí. Giọng Google dùng Google API key và tính phí theo giây. Giọng mặc định của mỗi dự án đặt trong Cài đặt dự án.</span>
      </div>
      {sfx && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="col" style={{ gap: 0 }}>
            <b>Hiệu ứng âm thanh</b>
            <span className="cap">Tiếng chuyển cảnh, xuất hiện, nhấn mạnh</span>
          </div>
          <div className="row">
            <input type="range" min={0} max={1} step={0.05} aria-label="Âm lượng hiệu ứng" disabled={!sfx.enabled} value={sfx.volume} onChange={(e) => saveSfx.mutate({ volume: Number(e.target.value) })} />
            <button className={`switch${sfx.enabled ? ' on' : ''}`} role="switch" aria-checked={sfx.enabled} aria-label="Bật hiệu ứng âm thanh" onClick={() => saveSfx.mutate({ enabled: !sfx.enabled })} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Settings › Kết nối AI: the current workspace's own connections, and whether it falls back to the shared keys. */
export function AiConnections() {
  const me = useMe().data;
  const llm = useQuery({ queryKey: keyFor('workspace', 'llm'), queryFn: settingsApi.llm }).data;
  const owner = me?.role === 'owner';
  return (
    <>
      <div className="alert">
        <span>Kết nối AI của workspace “{me?.workspace.name ?? '…'}”. Mỗi việc dùng một mô hình. API key không bao giờ hiện lại đầy đủ.</span>
      </div>
      {llm?.usingShared && (
        <div className="alert ok">
          <span>Workspace đang dùng khoá AI chung của hệ thống (do quản trị cho phép). Nhập khoá riêng bên dưới nếu muốn workspace tự trả phí.</span>
        </div>
      )}
      {llm && !llm.ready && !llm.sharedAllowed && (
        <div className="alert warn">
          <span>Workspace chưa có kết nối AI. Chủ workspace nhập API key của mình bên dưới để viết kịch bản, vẽ ảnh và lồng tiếng.</span>
        </div>
      )}
      {me && !owner && (
        <div className="alert">
          <span>Chỉ chủ workspace mới đổi được kết nối AI.</span>
        </div>
      )}
      <LlmCard />
      <ImageCard />
      <VoiceCard />
    </>
  );
}

/** Settings › Hệ thống (system admin): the shared keys, and which workspaces may use them. */
export function SystemTab() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'workspaces'], queryFn: () => api<AdminWorkspace[]>('/admin/workspaces') });
  const toggle = useMutation({
    mutationFn: (v: { id: string; on: boolean }) => api<AdminWorkspace[]>(`/admin/workspaces/${v.id}`, { method: 'PATCH', body: { usesSharedKeys: v.on } }),
    onSuccess: (d) => (qc.setQueryData(['admin', 'workspaces'], d), void qc.invalidateQueries({ queryKey: queryKeys.llmSettings })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <div className="alert">
        <span>Khoá AI chung của hệ thống: dùng cho mọi workspace được bật bên dưới mà chưa có khoá riêng. Phí của các workspace đó tính vào khoá này.</span>
      </div>
      <LlmCard level="shared" />
      <ImageCard level="shared" />
      <div className="card">
        <h2>Workspace được dùng khoá chung</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Chủ</th>
              <th>Người · Dự án</th>
              <th>Dùng khoá chung</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((w) => (
              <tr key={w.id}>
                <td>
                  <b>{w.name}</b>
                  <div className="cap">Tạo {new Date(w.createdAt).toLocaleDateString('vi-VN')}</div>
                </td>
                <td className="cap">{w.ownerEmail}</td>
                <td className="cap">
                  {w.members} · {w.projects}
                </td>
                <td>
                  <label className="row" style={{ gap: 6 }}>
                    <input type="checkbox" checked={w.usesSharedKeys} disabled={toggle.isPending} onChange={(e) => toggle.mutate({ id: w.id, on: e.target.checked })} />
                    <span className="cap">{w.usesSharedKeys ? 'Được dùng' : 'Không'}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

type AdminWorkspace = { id: string; name: string; usesSharedKeys: boolean; createdAt: string; ownerEmail: string; members: number; projects: number };
