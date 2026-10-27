'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useCurrentChannel } from '@/features/app';
import { ScenePlayer } from '@/features/episode/components/preview';
import { useTools } from '@/features/episode/hooks/use-episode';
import { brandOf } from '@/features/episode/lib/preview';
import type { BlockInfo, ToolInfo } from '@/features/episode/services/episode.api';
import { skillApi, skillKeys } from '@/features/skill/services/skill.api';

const FIELD_KIND: Record<string, string> = { text: 'chữ', textarea: 'đoạn văn', emoji: 'emoji', count: 'số lượng', color: 'màu', choice: 'lựa chọn' };

function BlockCard({ tool, block, usedBy, brand }: { tool: ToolInfo; block: BlockInfo; usedBy: string[]; brand: ReturnType<typeof brandOf> }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      {tool.previewable ? (
        <ScenePlayer block={block.ref} props={block.defaults} ordinal={1} brand={brand} durationSec={Math.max(block.minSeconds, 3.5)} />
      ) : (
        <div className="grid aspect-video place-items-center rounded-lg bg-muted text-caption text-muted-foreground">Xem sau khi dựng</div>
      )}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-body font-bold">{block.name}</h3>
          <span className="font-mono text-caption text-primary">@{block.ref}</span>
        </div>
        <p className="text-small text-slate-700">{block.summary}</p>
        <div className="mt-1 flex flex-wrap gap-1.5 text-caption">
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
            <Clock className="size-3" aria-hidden />
            tối thiểu {block.minSeconds}s
          </span>
          {block.fields.map((f) => (
            <span key={f.key} className="rounded-full bg-muted px-2 py-0.5">
              {f.label} · {FIELD_KIND[f.kind] ?? f.kind}
            </span>
          ))}
        </div>
        <details className="mt-1 text-small">
          <summary className="cursor-pointer font-semibold text-muted-foreground">Hướng dẫn cho AI</summary>
          <p className="mt-1 text-slate-700">{block.aiGuide}</p>
        </details>
        <p className="text-caption text-muted-foreground">{usedBy.length ? `Dùng trong skill: ${usedBy.join(', ')}` : 'Chưa có skill nào của kênh này dùng'}</p>
      </div>
    </article>
  );
}

export function ToolsView() {
  const { data: tools, isLoading } = useTools();
  const { current } = useCurrentChannel();
  const { data: skills } = useQuery({ queryKey: skillKeys.list(current?.id ?? ''), queryFn: () => skillApi.list(current!.id), enabled: Boolean(current) });
  const brand = brandOf(current);
  // A skill uses a block if it lists the block or its whole tool.
  const usedBy = (tool: ToolInfo, block: BlockInfo) => (skills ?? []).filter((s) => s.tools.includes(block.ref) || s.tools.includes(tool.id)).map((s) => s.name);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Công cụ dựng"
        description="Phần nâng cao: các loại cảnh mà video có thể dùng, với xem trước trực tiếp. Bạn thường không cần mở trang này; trợ lý và kiểu video tự chọn loại cảnh phù hợp. (Kỹ thuật: tool là code trong src/tools/<tool>/; skill gọi chúng bằng @tool hoặc @tool/khối.)"
      />
      {isLoading ? <Skeleton className="h-64 rounded-2xl" /> : null}
      {(tools ?? []).map((tool) => (
        <section key={tool.id} aria-labelledby={`tool-${tool.id}`} className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-[16rem] flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 id={`tool-${tool.id}`} className="text-h3 font-bold">
                  {tool.name}
                </h2>
                <span className="font-mono text-small text-primary">@{tool.id}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-caption">v{tool.version}</span>
              </div>
              <p className="mt-1 text-small text-slate-700">{tool.summary}</p>
              {tool.requires ? <p className="mt-1 text-caption text-muted-foreground">Cần: {tool.requires}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-caption font-semibold text-success">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Đang hoạt động
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-caption font-semibold text-muted-foreground">
                {tool.previewable ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
                {tool.previewable ? 'Xem trước trực tiếp' : 'Chỉ xem sau khi dựng'}
              </span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tool.blocks.map((b) => (
              <BlockCard key={b.ref} tool={tool} block={b} usedBy={usedBy(tool, b)} brand={brand} />
            ))}
          </div>
        </section>
      ))}
      <p className="text-small text-muted-foreground">
        Thêm khối mới: một file trong <code className="rounded bg-muted px-1">src/tools/&lt;tool&gt;/blocks/</code>, một component trong <code className="rounded bg-muted px-1">remotion/blocks/</code>, đăng ký trong tool. Xem{' '}
        <Link href={ROUTES.skills} className="font-semibold text-primary hover:underline">
          Skills
        </Link>{' '}
        để biết skill nào dùng khối nào.
      </p>
    </div>
  );
}
