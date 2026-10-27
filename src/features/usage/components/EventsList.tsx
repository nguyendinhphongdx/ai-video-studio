'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROUTES } from '@/constants/routes';

import { fmtNum, fmtUsd, KIND_SHORT, purposeLabel } from '../lib/format';
import { usageApi, usageKeys, type UsageRange } from '../services/usage.api';

const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Every paid call, newest first, with what it was for and what it cost. */
export function EventsList({ range }: { range: UsageRange }) {
  const [kind, setKind] = useState('all');
  const q = useInfiniteQuery({
    queryKey: usageKeys.events(range, kind),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => usageApi.events(range, kind === 'all' ? '' : kind, pageParam),
    getNextPageParam: (last) => (last.length >= 40 ? last.at(-1)!.at : undefined),
  });
  const rows = q.data?.pages.flat() ?? [];
  return (
    <section aria-labelledby="events-h" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="events-h" className="text-body font-bold">
          Lịch sử gọi AI
        </h3>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="h-9 w-40" aria-label="Lọc theo loại">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="llm">Văn bản (LLM)</SelectItem>
            <SelectItem value="image">Ảnh</SelectItem>
            <SelectItem value="tts">Giọng đọc</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rows.length ? (
        <ul className="divide-y">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-small">
              <span className="w-24 shrink-0 text-caption text-muted-foreground tabular-nums">{when(e.at)}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-semibold">{KIND_SHORT[e.kind]}</span>
              <span className="min-w-0 flex-1 basis-40">
                <span className="font-medium">{purposeLabel(e.purpose)}</span>
                <span className="block truncate text-caption text-muted-foreground">
                  {e.channelName ? `${e.channelName} · ` : ''}
                  {e.episodeId ? (
                    <Link href={ROUTES.episode(e.episodeId)} className="hover:underline">
                      {e.episodeTitle ?? 'video'}
                    </Link>
                  ) : null}
                  {e.episodeId ? ' · ' : ''}
                  {e.model}
                </span>
              </span>
              <span className="text-caption text-muted-foreground tabular-nums">
                {e.kind === 'llm' ? `${fmtNum(e.inputTokens + e.cachedTokens)} vào · ${fmtNum(e.outputTokens)} ra` : e.kind === 'image' ? `${Math.round(e.units)} ảnh` : `${Math.round(e.units)} giây`}
                {e.estimated ? ' · ước tính' : ''}
              </span>
              <span className="w-20 shrink-0 text-right font-semibold tabular-nums">{e.costUsd === null ? <span title="Chưa có giá cho model này trong bảng giá" className="text-warning">chưa có giá</span> : fmtUsd(e.costUsd)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-small text-muted-foreground">{q.isLoading ? 'Đang tải…' : 'Chưa có lượt gọi nào trong khoảng này.'}</p>
      )}
      {q.hasNextPage ? (
        <Button variant="outline" className="w-fit self-center" disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
          Xem thêm
        </Button>
      ) : null}
    </section>
  );
}
