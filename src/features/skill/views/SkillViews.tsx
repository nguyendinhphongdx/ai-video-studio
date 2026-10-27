'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleAlert, Download, FileText, Loader2, Plus, Save, Store, Trash2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { UpgradeSkillButton } from '../components/UpgradeSkillButton';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/animate-ui/components/radix/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES } from '@/constants/routes';
import { parseSkill } from '@/core/skills/skill';
import { useCurrentChannel } from '@/features/app';
import { useTools } from '@/features/episode/hooks/use-episode';
import type { ToolInfo } from '@/features/episode/services/episode.api';
import { errorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { SkillMarkdown } from '../components/SkillMarkdown';
import { skillApi, skillKeys, type SkillIssue } from '../services/skill.api';

/** Expand "remotion" / "remotion/cards" into block names, like the server catalog does. */
function useRefResolver() {
  const { data: tools } = useTools();
  const all = (tools ?? []) as ToolInfo[];
  const resolve = (ref: string) => {
    const tool = all.find((t) => t.id === ref);
    if (tool) return { label: `Mọi khối của ${tool.name}`, blocks: tool.blocks.map((b) => b.name), known: true };
    const block = all.flatMap((t) => t.blocks).find((b) => b.ref === ref);
    return block ? { label: block.name, blocks: [block.name], known: true } : { label: ref, blocks: [], known: false };
  };
  return { resolve, known: (ref: string) => resolve(ref).known, loaded: Boolean(tools) };
}

function Issues({ issues }: { issues: SkillIssue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {issues.map((i, k) => (
        <li key={k} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-small', i.level === 'error' ? 'bg-danger-soft text-destructive' : 'bg-warning-soft text-warning')}>
          {i.level === 'error' ? <CircleAlert className="size-4 shrink-0" aria-hidden /> : <TriangleAlert className="size-4 shrink-0" aria-hidden />}
          {i.message}
        </li>
      ))}
    </ul>
  );
}

function ToolChips({ tools }: { tools: string[] }) {
  const { resolve } = useRefResolver();
  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.map((t) => (
        <span key={t} className={cn('rounded-md px-2 py-0.5 font-mono text-caption', resolve(t).known ? 'bg-accent text-accent-foreground' : 'bg-danger-soft text-destructive')}>
          @{t}
        </span>
      ))}
    </div>
  );
}

const sourceLabel = (source: string) => (source.startsWith('market:') ? `Từ kho · ${source.slice(7)}` : source === 'ai' ? 'AI soạn' : 'Tự soạn');

function NoChannel() {
  return <p className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center text-small text-muted-foreground">Chọn hoặc tạo một kênh trước. Skill thuộc về từng kênh.</p>;
}

export function SkillListView() {
  const qc = useQueryClient();
  const { current } = useCurrentChannel();
  const [tab, setTab] = useState<'channel' | 'market'>('channel');
  const cid = current?.id ?? '';
  const skills = useQuery({ queryKey: skillKeys.list(cid), queryFn: () => skillApi.list(cid), enabled: Boolean(cid) });
  const market = useQuery({ queryKey: skillKeys.market(cid), queryFn: () => skillApi.market(cid), enabled: Boolean(cid) });
  const install = useMutation({
    mutationFn: (marketId: string) => skillApi.install(cid, marketId),
    onSuccess: (d) => {
      void qc.invalidateQueries({ queryKey: skillKeys.list(cid) });
      void qc.invalidateQueries({ queryKey: skillKeys.market(cid) });
      toast.success(`Đã cài “${d.skill.name}” về kênh ${current?.name ?? ''}. Giờ nó là của kênh, sửa thoải mái.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kiểu video"
        description={`Công thức làm từng loại video của kênh ${current?.name ?? ''} (trong tài liệu kỹ thuật gọi là skill). Mỗi kiểu thuộc về kênh: cài từ kho có sẵn rồi sửa riêng, hoặc nhờ trợ lý soạn từ tri thức của kênh.`}
        actions={
          <Button asChild disabled={!current}>
            <Link href={`${ROUTES.skills}/new`}>
              <Plus aria-hidden />
              Soạn kiểu video mới
            </Link>
          </Button>
        }
      />
      {!current ? (
        <NoChannel />
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'channel' | 'market')}>
            <TabsList>
              <TabsTrigger value="channel">
                Skill của kênh<span className="ml-1.5 text-muted-foreground">{skills.data?.length ?? 0}</span>
              </TabsTrigger>
              <TabsTrigger value="market">
                <Store className="mr-1.5 size-4" aria-hidden />
                Market
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === 'channel' ? (
            <>
              {skills.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : null}
              {skills.data && !skills.data.length ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
                  <p className="max-w-md text-small text-muted-foreground">Kênh chưa có skill nào. Cài một skill từ market hoặc nhờ AI soạn skill riêng từ tri thức của kênh.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setTab('market')}>
                      <Store aria-hidden />
                      Xem market
                    </Button>
                    <Button asChild>
                      <Link href={`${ROUTES.skills}/new`}>Soạn skill mới</Link>
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(skills.data ?? []).map((s) => (
                  <Link key={s.id} href={`${ROUTES.skills}/${s.id}`} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                        <FileText className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="text-title font-bold">{s.name}</div>
                        <div className="font-mono text-caption text-muted-foreground">{s.id}</div>
                      </div>
                      {s.update ? <span className="ml-auto rounded-full bg-warning-soft px-2 py-0.5 text-caption font-semibold text-warning">Có bản mới</span> : null}
                      {s.issues.some((i) => i.level === 'error') ? <span className="ml-auto rounded-full bg-danger-soft px-2 py-0.5 text-caption font-semibold text-destructive">Lỗi</span> : null}
                    </div>
                    {s.description ? <p className="line-clamp-3 text-small text-slate-700">{s.description}</p> : null}
                    <ToolChips tools={s.tools} />
                    <div className="mt-auto flex flex-wrap gap-x-3 text-caption text-muted-foreground">
                      <span>
                        {s.scenes.min}–{s.scenes.max} cảnh
                      </span>
                      <span>{sourceLabel(s.source)}</span>
                      {current.defaultSkillId === s.id ? <span className="font-semibold text-primary">Mặc định của kênh</span> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <>
              {market.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : null}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(market.data ?? []).map((m) => (
                  <div key={m.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                        <Store className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="text-title font-bold">{m.name}</div>
                        <div className="font-mono text-caption text-muted-foreground">
                          {m.id} · v{m.version}
                        </div>
                      </div>
                    </div>
                    <p className="line-clamp-4 text-small text-slate-700">{m.description}</p>
                    <ToolChips tools={m.tools} />
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <span className="text-caption text-muted-foreground">
                        {m.scenes.min}–{m.scenes.max} cảnh
                      </span>
                      {m.installedAs ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`${ROUTES.skills}/${m.installedAs}`}>Đã cài, mở</Link>
                        </Button>
                      ) : (
                        <Button size="sm" disabled={install.isPending || m.issues.some((i) => i.level === 'error')} onClick={() => install.mutate(m.id)}>
                          {install.isPending && install.variables === m.id ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
                          Cài về kênh
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const TEMPLATE = `---
name: Tên skill
description: "Skill này làm loại video nào, hợp kênh nào."
tools: [remotion/outro]
scenes: 6-10
---

# Mục tiêu

# Cấu trúc

# Văn phong lời đọc
`;

/** Edits one skill of the channel (or writes a new one). The AI only produces drafts; nothing is saved until the person saves. */
export function SkillEditorView({ id }: { id: string | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { current } = useCurrentChannel();
  const { resolve, known } = useRefResolver();
  const cid = current?.id ?? '';
  const isNew = id === null;
  const detail = useQuery({ queryKey: skillKeys.one(cid, id ?? ''), queryFn: () => skillApi.get(cid, id!), enabled: Boolean(cid) && !isNew });
  const [markdown, setMarkdown] = useState<string | null>(isNew ? TEMPLATE : null);
  const [newId, setNewId] = useState('');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const list = useQuery({ queryKey: skillKeys.list(cid), queryFn: () => skillApi.list(cid), enabled: Boolean(cid) && !isNew });
  const updateInfo = list.data?.find((x) => x.id === id)?.update ?? null;
  const text = markdown ?? detail.data?.markdown ?? '';
  const dirty = markdown !== null && (isNew || markdown !== detail.data?.markdown);
  
  const parsed = (() => {
    try {
      return parseSkill(id ?? 'draft', text);
    } catch (e) {
      return { error: (e as Error).message } as const;
    }
  })();

  const save = useMutation({
    mutationFn: () => (isNew ? skillApi.create(cid, newId.trim(), text, 'custom') : skillApi.save(cid, id!, text)),
    onSuccess: (d) => {
      void qc.invalidateQueries({ queryKey: ['skills'] });
      void qc.invalidateQueries({ queryKey: ['skill'] });
      void qc.invalidateQueries({ queryKey: ['market'] });
      toast.success('Đã lưu skill');
      if (isNew) router.replace(`${ROUTES.skills}/${d.skill.id}`);
      else setMarkdown(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => skillApi.remove(cid, id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['skills'] });
      void qc.invalidateQueries({ queryKey: ['market'] });
      toast.success('Đã xoá skill');
      router.push(ROUTES.skills);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!current) return <NoChannel />;
  return (
    <div className="flex flex-col gap-6 pb-24">
      <Link href={ROUTES.skills} className="flex w-fit items-center gap-1.5 text-small text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Tất cả skill
      </Link>
      {detail.error ? <p className="text-destructive">{detail.error.message}</p> : null}
      {!isNew && !detail.data && !detail.error ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <PageHeader
            title={isNew ? 'Soạn skill mới' : 'error' in parsed ? (id ?? '') : parsed.name}
            description={isNew ? `Skill sẽ thuộc kênh ${current.name}. Nhờ AI soạn từ tri thức của kênh, hoặc tự viết.` : detail.data ? `${sourceLabel(detail.data.source)} · cập nhật ${new Date(detail.data.updatedAt).toLocaleString('vi-VN')}` : undefined}
            actions={
              !isNew ? (
                <div className="flex flex-wrap gap-2">
                  {updateInfo ? <UpgradeSkillButton channelId={cid} skillId={id!} size="default" /> : null}
                  <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 aria-hidden />
                    Xoá skill
                  </Button>
                </div>
              ) : null
            }
          />
          <p className="rounded-xl bg-accent/50 p-3.5 text-small text-muted-foreground">
            Muốn trợ lý soạn hoặc sửa skill này? Bấm nút ✨ ở góc màn hình và nói điều bạn muốn, ví dụ “soạn skill cho video giải thích lịch sử 90 giây” hoặc “thêm quy tắc về số liệu vào skill này”. Trợ lý dựa vào tri thức và các công cụ của kênh.
          </p>
          {isNew ? (
            <div className="flex max-w-sm flex-col gap-1.5">
              <Label htmlFor="skill-id">Mã skill</Label>
              <Input id="skill-id" value={newId} onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="vd: giai-thich-lich-su" maxLength={48} className="font-mono" />
              <span className="text-caption text-muted-foreground">Chữ thường, số, gạch ngang. Đặt xong không đổi được.</span>
            </div>
          ) : null}
          {detail.data ? <Issues issues={detail.data.issues} /> : null}
          {'error' in parsed ? <Issues issues={[{ level: 'error', message: parsed.error }]} /> : null}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex min-w-0 flex-col gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as 'edit' | 'preview')}>
                <TabsList className="w-fit">
                  <TabsTrigger value="edit">Soạn</TabsTrigger>
                  <TabsTrigger value="preview">Xem</TabsTrigger>
                </TabsList>
              </Tabs>
              {view === 'edit' ? (
                <>
                  <Label htmlFor="skill-md" className="sr-only">
                    Nội dung SKILL.md
                  </Label>
                  <Textarea id="skill-md" value={text} onChange={(e) => setMarkdown(e.target.value)} rows={28} spellCheck={false} className="min-h-[28rem] font-mono text-small leading-relaxed" />
                </>
              ) : 'error' in parsed ? (
                <p className="text-small text-muted-foreground">Chưa đọc được skill: sửa lỗi ở trên trước.</p>
              ) : (
                <SkillMarkdown markdown={text} known={known} />
              )}
            </div>
            <aside className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
              {'error' in parsed ? null : (
                <>
                  <div>
                    <h2 className="text-small font-semibold text-muted-foreground">Số cảnh gợi ý</h2>
                    <p className="text-title font-bold">
                      {parsed.scenes.min}–{parsed.scenes.max}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-small font-semibold text-muted-foreground">Công cụ được dùng</h2>
                    {parsed.tools.map((t) => {
                      const r = resolve(t);
                      return (
                        <div key={t} className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2">
                          <span className={cn('font-mono text-caption font-semibold', r.known ? 'text-primary' : 'text-destructive')}>@{t}</span>
                          <span className="text-small">{r.known ? r.label : 'Không tồn tại'}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <Link href={ROUTES.tools} className="text-small font-semibold text-primary hover:underline">
                Xem các tool và khối →
              </Link>
            </aside>
          </div>
          {dirty ? (
            <div data-action-bar className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:left-60">
              <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-12">
                <span className="text-small font-semibold text-warning">● Có thay đổi chưa lưu</span>
                {!isNew ? (
                  <Button variant="ghost" className="ml-auto" onClick={() => setMarkdown(null)}>
                    Bỏ thay đổi
                  </Button>
                ) : null}
                <Button className={cn('font-bold', isNew && 'ml-auto')} disabled={save.isPending || (isNew && newId.trim().length < 2)} onClick={() => save.mutate()}>
                  {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                  {isNew ? 'Lưu skill' : 'Lưu thay đổi'}
                </Button>
              </div>
            </div>
          ) : null}
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Xoá skill này khỏi kênh?</DialogTitle>
                <DialogDescription>Skill trong market không bị ảnh hưởng, cài lại được bất cứ lúc nào. Không xoá được skill đang được video hoặc series dùng.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                  Huỷ
                </Button>
                <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
                  Xoá skill
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
