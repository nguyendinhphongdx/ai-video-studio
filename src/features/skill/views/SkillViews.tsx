'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CircleAlert, ExternalLink, FileText, Loader2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useCurrentChannel } from '@/features/app';
import { useTools } from '@/features/episode/hooks/use-episode';
import type { ToolInfo } from '@/features/episode/services/episode.api';
import { errorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { SkillMarkdown } from '../components/SkillMarkdown';
import { skillApi, type SkillSummary } from '../services/skill.api';

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

function Issues({ issues }: { issues: SkillSummary['issues'] }) {
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

export function SkillListView() {
  const { data: skills, isLoading } = useQuery({ queryKey: ['skills'], queryFn: skillApi.list });
  const { resolve } = useRefResolver();
  const { channels } = useCurrentChannel();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Skills"
        description="Công thức làm từng loại video, lưu thành file content/skills/<id>/SKILL.md và quản lý bằng git. Skill gọi công cụ dựng bằng @tool hoặc @tool/khối. Ở bản này skill chỉ xem trong app; sửa bằng trình soạn thảo."
      />
      {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(skills ?? []).map((s) => {
          const usedBy = channels.filter((c) => c.defaultSkillId === s.id);
          return (
            <Link key={s.id} href={`${ROUTES.skills}/${s.id}`} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="text-title font-bold">{s.name}</div>
                  <div className="font-mono text-caption text-muted-foreground">{s.id}</div>
                </div>
                {s.issues.some((i) => i.level === 'error') ? <span className="ml-auto rounded-full bg-danger-soft px-2 py-0.5 text-caption font-semibold text-destructive">Lỗi</span> : null}
              </div>
              {s.description ? <p className="line-clamp-3 text-small text-slate-700">{s.description}</p> : null}
              <div className="flex flex-wrap gap-1.5">
                {s.tools.map((t) => (
                  <span key={t} className={cn('rounded-md px-2 py-0.5 font-mono text-caption', resolve(t).known ? 'bg-accent text-accent-foreground' : 'bg-danger-soft text-destructive')}>
                    @{t}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex flex-wrap gap-x-3 text-caption text-muted-foreground">
                <span>{s.scenes.min}–{s.scenes.max} cảnh</span>
                {usedBy.length ? <span>Mặc định của: {usedBy.map((c) => c.name).join(', ')}</span> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SkillDetailView({ id }: { id: string }) {
  const { data, error } = useQuery({ queryKey: ['skill', id], queryFn: () => skillApi.get(id) });
  const { resolve, known } = useRefResolver();
  const open = useMutation({
    mutationFn: () => skillApi.openInEditor(id),
    onSuccess: (r) => toast.success(`Đã mở ${r.path}`),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="flex flex-col gap-6">
      <Link href={ROUTES.skills} className="flex w-fit items-center gap-1.5 text-small text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Tất cả skill
      </Link>
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {!data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <PageHeader
            title={data.skill.name}
            description={data.skill.description}
            actions={
              <Button variant="outline" onClick={() => open.mutate()} disabled={open.isPending}>
                {open.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <ExternalLink aria-hidden />}
                Mở trong editor
              </Button>
            }
          />
          <Issues issues={data.issues} />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="font-mono text-caption text-muted-foreground">{data.path}</div>
              <SkillMarkdown markdown={data.markdown} known={known} />
            </div>
            <aside className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
              <div>
                <h2 className="text-small font-semibold text-muted-foreground">Số cảnh gợi ý</h2>
                <p className="text-title font-bold">
                  {data.skill.scenes.min}–{data.skill.scenes.max}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-small font-semibold text-muted-foreground">Công cụ được dùng</h2>
                {data.skill.tools.map((t) => {
                  const r = resolve(t);
                  return (
                    <div key={t} className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2">
                      <span className={cn('font-mono text-caption font-semibold', r.known ? 'text-primary' : 'text-destructive')}>@{t}</span>
                      <span className="text-small">{r.known ? r.label : 'Không tồn tại'}</span>
                    </div>
                  );
                })}
              </div>
              <Link href={ROUTES.tools} className="text-small font-semibold text-primary hover:underline">
                Xem các tool và khối →
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
