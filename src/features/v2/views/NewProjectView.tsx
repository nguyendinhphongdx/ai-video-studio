'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { VOICES } from '@/core/domain/catalog';
import { queryKeys } from '@/features/app';
import { channelApi, NEW_CHANNEL, type ChannelInput } from '@/features/channel/services/channel.api';
import { errorMessage } from '@/lib/api/client';

import { projectHref } from '../model';
import { Page, Topbar } from '../Shell';

/** New project: just what the AI needs to start writing. Style, skills and characters come next, inside the project. */
export function NewProjectView() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState<ChannelInput>(NEW_CHANNEL);
  const set = <K extends keyof ChannelInput>(k: K, v: ChannelInput[K]) => setForm({ ...form, [k]: v });
  const create = useMutation({
    mutationFn: () => channelApi.create(form),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: queryKeys.channels });
      toast.success('Đã tạo dự án');
      router.push(projectHref(c.id, 'style'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const ok = form.name.trim() && form.audience.trim() && form.style.trim();

  return (
    <>
      <Topbar crumbs={[{ label: 'Trang chủ', href: '/' }, 'Dự án mới']} />
      <Page width={760}>
        <div className="head">
          <div>
            <h1>Dự án mới</h1>
            <p>Một dự án là một kênh hoặc một loạt video. Sau khi tạo, bạn chọn phong cách, cài skill và dựng nhân vật.</p>
          </div>
        </div>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (ok) create.mutate();
          }}
        >
          <div className="field">
            <label htmlFor="np-name">Tên dự án</label>
            <input id="np-name" className="input" maxLength={60} autoFocus placeholder="Ví dụ: Phong Thần Diễn Nghĩa" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="np-desc">Dự án nói về gì</label>
            <textarea id="np-desc" className="area" maxLength={500} placeholder="Một hai câu cho AI và cho người xem" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="np-aud">Khán giả</label>
              <input id="np-aud" className="input" maxLength={300} value={form.audience} onChange={(e) => set('audience', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="np-voice">Giọng đọc</label>
              <select id="np-voice" className="select" value={form.voice} onChange={(e) => set('voice', e.target.value as ChannelInput['voice'])}>
                {Object.entries(VOICES).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="np-style">Giọng văn</label>
            <input id="np-style" className="input" maxLength={500} value={form.style} onChange={(e) => set('style', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="np-color">Màu chính</label>
            <input id="np-color" type="color" className="input" style={{ width: 64, padding: 2 }} value={form.palette[0]} onChange={(e) => set('palette', [e.target.value.toUpperCase(), ...form.palette.slice(1)])} />
          </div>
          <div className="row">
            <button className="btn pri" disabled={!ok || create.isPending}>
              Tạo dự án
            </button>
            <button type="button" className="btn ghost" onClick={() => router.back()}>
              Huỷ
            </button>
          </div>
        </form>
      </Page>
    </>
  );
}
