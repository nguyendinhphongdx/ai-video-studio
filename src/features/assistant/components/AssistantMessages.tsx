'use client';

import { CircleAlert, CircleCheck, Loader2, ShieldQuestion, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { AssistantMessage } from '../services/assistant.api';

import { RichText } from './RichText';

const RISK_LABEL: Record<string, string> = { write: 'Ghi dữ liệu', paid: 'Tốn tiền hoặc chạy lâu', destructive: 'Xoá' };

function ToolCard({ m, onDecide, deciding }: { m: AssistantMessage; onDecide: (approve: boolean) => void; deciding: boolean }) {
  const risk = (m.data as { risk?: string } | null)?.risk ?? '';
  const tone = m.status === 'awaiting' ? 'border-warning/50 bg-warning-soft' : m.status === 'error' ? 'border-destructive/40 bg-danger-soft' : m.status === 'rejected' ? 'bg-muted text-muted-foreground' : 'bg-card';
  const Icon = m.status === 'awaiting' ? ShieldQuestion : m.status === 'error' ? CircleAlert : m.status === 'rejected' ? XCircle : CircleCheck;
  return (
    <div className={cn('flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-small', tone)}>
      <div className="flex items-start gap-2">
        <Icon className={cn('mt-0.5 size-4 shrink-0', m.status === 'done' && 'text-success', m.status === 'error' && 'text-destructive', m.status === 'awaiting' && 'text-warning')} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-snug">{m.summary || m.toolName}</div>
          {m.status === 'awaiting' ? <div className="text-caption text-muted-foreground">{RISK_LABEL[risk] ?? 'Cần bạn đồng ý'} · đang chờ bạn</div> : null}
          {m.status === 'rejected' ? <div className="text-caption">Bạn đã từ chối</div> : null}
          {m.status === 'error' ? <div className="mt-0.5 text-caption text-destructive">{m.content}</div> : null}
        </div>
      </div>
      {m.status === 'awaiting' ? (
        <div className="flex gap-2">
          <Button size="sm" className="h-9 flex-1" disabled={deciding} onClick={() => onDecide(true)}>
            {deciding ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Đồng ý
          </Button>
          <Button size="sm" variant="outline" className="h-9 flex-1" disabled={deciding} onClick={() => onDecide(false)}>
            Từ chối
          </Button>
        </div>
      ) : null}
      {m.status === 'done' && m.content ? (
        <details className="text-caption text-muted-foreground">
          <summary className="cursor-pointer">Chi tiết</summary>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2">{m.content.slice(0, 1500)}</pre>
        </details>
      ) : null}
    </div>
  );
}

export function AssistantMessages({ messages, running, onDecide, deciding }: { messages: AssistantMessage[]; running: boolean; onDecide: (id: number, approve: boolean) => void; deciding: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, running]);
  return (
    <div className="flex flex-col gap-3" role="log" aria-live="polite" aria-label="Cuộc trò chuyện với trợ lý">
      {messages.map((m) => {
        if (m.role === 'user') {
          return (
            <div key={m.id} className="ml-8 self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-small text-primary-foreground">
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          );
        }
        if (m.role === 'assistant') {
          if (!m.content.trim()) return null;
          return (
            <div key={m.id} className={cn('mr-6 self-start rounded-2xl rounded-bl-md border bg-card px-3.5 py-2.5 text-small leading-relaxed', m.status === 'error' && 'border-destructive/40 bg-danger-soft')}>
              <RichText text={m.content} />
            </div>
          );
        }
        return (
          <div key={m.id} className="mr-6">
            <ToolCard m={m} deciding={deciding} onDecide={(approve) => onDecide(m.id, approve)} />
          </div>
        );
      })}
      {running ? (
        <div role="status" className="flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-caption text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Trợ lý đang làm…
        </div>
      ) : null}
      <div ref={end} />
    </div>
  );
}
