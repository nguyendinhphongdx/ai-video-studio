'use client';

import { useEffect, useState } from 'react';

import { useChannel, useChannelAction } from '@/features/channel/hooks/use-channels';
import { channelApi, toInput, type ChannelInput } from '@/features/channel/services/channel.api';

import { projectHref } from '../model';
import { Loading, Page, Topbar } from '../Shell';
import { BrandSection } from './settings/BrandSection';
import { CostSection } from './settings/CostSection';
import { GeneralSection } from './settings/GeneralSection';
import { KnowledgeSection } from './settings/KnowledgeSection';
import { FIELDS, SECTIONS, type SectionKey } from './settings/sections';
import { VoiceSection } from './settings/VoiceSection';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fromHash = (): SectionKey => SECTIONS.find((s) => s.key === window.location.hash.slice(1))?.key ?? 'general';

/**
 * Project settings: a menu of sections and one section at a time. General, brand and voice edit the project's own fields
 * and each saves only its own; knowledge saves versions; cost saves the budget. Leaving a section with unsaved changes asks first.
 */
export function ProjectSettingsView({ projectId }: { projectId: string }) {
  const project = useChannel(projectId);
  const [section, setSection] = useState<SectionKey>('general');
  const [form, setForm] = useState<ChannelInput | null>(null);
  const [knowledgeDirty, setKnowledgeDirty] = useState(false);
  // The section lives in the URL hash: open on it, and follow back/forward and typed links.
  useEffect(() => {
    setSection(fromHash());
    const onHash = () => setSection(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (project.data && !form) setForm(toInput(project.data));
  }, [project.data, form]);
  const save = useChannelAction(projectId, (input: ChannelInput) => channelApi.update(projectId, input), 'Đã lưu cài đặt dự án');

  const server = project.data ? toInput(project.data) : null;
  const dirtyFields = (key: SectionKey) => (form && server ? (FIELDS[key] ?? []).filter((f) => !same(form[f], server[f])) : []);
  const isDirty = (key: SectionKey) => (key === 'knowledge' ? knowledgeDirty : dirtyFields(key).length > 0);
  const anyDirty = SECTIONS.some((s) => isDirty(s.key));

  // Closing or reloading the tab with unsaved work asks first.
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [anyDirty]);

  const set = <K extends keyof ChannelInput>(k: K, v: ChannelInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const discard = (key: SectionKey) => {
    if (key === 'knowledge') return;
    setForm((f) => (f && server ? { ...f, ...Object.fromEntries((FIELDS[key] ?? []).map((k) => [k, server[k]])) } : f));
  };
  const go = (next: SectionKey) => {
    if (next === section) return;
    if (isDirty(section)) {
      if (!window.confirm('Phần này có thay đổi chưa lưu. Bỏ thay đổi và chuyển sang phần khác?')) return;
      discard(section);
      if (section === 'knowledge') setKnowledgeDirty(false);
    }
    setSection(next);
    window.history.replaceState(null, '', `#${next}`);
  };
  const saveSection = () => {
    if (!form || !server || !FIELDS[section]) return;
    save.mutate({ ...server, ...Object.fromEntries(FIELDS[section]!.map((k) => [k, form[k]])) });
  };
  const current = SECTIONS.find((s) => s.key === section)!;
  const sectionDirty = isDirty(section);

  return (
    <>
      <Topbar crumbs={[{ label: project.data?.name ?? 'Dự án', href: projectHref(projectId) }, 'Cài đặt dự án', current.label]}>
        {sectionDirty && <span className="chip warn">Chưa lưu</span>}
        {FIELDS[section] && (
          <button type="button" className="btn pri" disabled={!sectionDirty || save.isPending} onClick={saveSection}>
            {save.isPending ? 'Đang lưu…' : 'Lưu phần này'}
          </button>
        )}
      </Topbar>
      <Page width={1180}>
        {!form || !project.data ? (
          <Loading />
        ) : (
          <div className="setgrid">
            <nav className="setmenu" aria-label="Các phần của cài đặt">
              <label className="sr-only" htmlFor="set-select">
                Chọn phần cài đặt
              </label>
              <select id="set-select" className="input setmenu-select" value={section} onChange={(e) => go(e.target.value as SectionKey)}>
                {SECTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                    {isDirty(s.key) ? ' (chưa lưu)' : ''}
                  </option>
                ))}
              </select>
              <ul>
                {SECTIONS.map((s) => (
                  <li key={s.key}>
                    <a href={`#${s.key}`} className={s.key === section ? 'on' : undefined} aria-current={s.key === section ? 'page' : undefined} onClick={(e) => (e.preventDefault(), go(s.key))}>
                      <span>
                        <b>{s.label}</b>
                        <span className="cap">{s.hint}</span>
                      </span>
                      {isDirty(s.key) && <i className="unsaved" role="img" aria-label="Chưa lưu" />}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="setbody">
              {section === 'general' && <GeneralSection form={form} set={set} />}
              {section === 'brand' && <BrandSection project={project.data} form={form} set={set} setForm={(fn) => setForm((f) => (f ? fn(f) : f))} />}
              {section === 'voice' && <VoiceSection project={project.data} form={form} set={set} />}
              {section === 'knowledge' && <KnowledgeSection project={project.data} onDirty={setKnowledgeDirty} />}
              {section === 'cost' && <CostSection projectId={projectId} />}
            </div>
          </div>
        )}
      </Page>
    </>
  );
}
