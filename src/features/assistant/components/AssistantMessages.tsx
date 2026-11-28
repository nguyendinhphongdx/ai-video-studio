'use client';

import { Brain, Check, ChevronRight, CircleAlert, CircleCheck, Copy, FileText, Loader2, ShieldQuestion, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Attachment, AttachmentContent, AttachmentGroup, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from '@/components/ui/attachment';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Message, MessageContent, MessageFooter } from '@/components/ui/message';
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from '@/components/ui/message-scroller';
import { isPicture } from '@/core/assistant/attachments';
import { pendingItems, type LiveItem, type LiveTurn } from '@/core/assistant/stream';
import { cn } from '@/lib/utils';

import { attachmentUrl, type AssistantAttachment, type AssistantMessage } from '../services/assistant.api';

import { Markdown } from './Markdown';

const RISK_LABEL: Record<string, string> = { write: 'Ghi dữ liệu', paid: 'Tốn tiền hoặc chạy lâu', destructive: 'Xoá' };
const STATE: Record<string, { label: string; icon: typeof CircleCheck; tone: string }> = {
  running: { label: 'Đang chạy', icon: Loader2, tone: 'animate-spin text-primary' },
  awaiting: { label: 'Chờ bạn đồng ý', icon: ShieldQuestion, tone: 'text-warning' },
  done: { label: 'Xong', icon: CircleCheck, tone: 'text-success' },
  error: { label: 'Lỗi', icon: CircleAlert, tone: 'text-destructive' },
  rejected: { label: 'Bạn đã từ chối', icon: XCircle, tone: 'text-muted-foreground' },
};

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold">{title}</span>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2">{text.slice(0, 1500)}</pre>
    </div>
  );
}

/** One tool step: what it is, where it stands, its input and result, and the yes or no it may be waiting for. */
function ToolCard({ m, input, onDecide, deciding }: { m: AssistantMessage; input: Record<string, unknown> | undefined; onDecide: (approve: boolean) => void; deciding: boolean }) {
  const risk = (m.data as { risk?: string } | null)?.risk ?? '';
  const state = STATE[m.status] ?? STATE.done!;
  const tone = m.status === 'awaiting' ? 'border-warning/50 bg-warning-soft' : m.status === 'error' ? 'border-destructive/40 bg-danger-soft' : 'bg-card';
  const args = input && Object.keys(input).length ? JSON.stringify(input, null, 2) : '';
  const result = m.status === 'done' ? m.content : '';
  return (
    <div className={cn('flex w-full flex-col gap-2 rounded-xl border px-3 py-2.5 text-small', tone)}>
      <Collapsible>
        <CollapsibleTrigger className="group flex w-full items-start gap-2 text-left" disabled={!args && !result}>
          <state.icon className={cn('mt-0.5 size-4 shrink-0', state.tone)} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">{m.summary || m.toolName}</span>
            <span className="block text-caption text-muted-foreground">{m.status === 'awaiting' ? `${RISK_LABEL[risk] ?? 'Cần bạn đồng ý'} · ${state.label.toLowerCase()}` : state.label}</span>
          </span>
          {args || result ? <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" aria-hidden /> : null}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 flex flex-col gap-2 text-caption text-muted-foreground">
          {args ? <Block title="Đầu vào" text={args} /> : null}
          {result ? <Block title="Kết quả" text={result} /> : null}
        </CollapsibleContent>
      </Collapsible>
      {/* A failure is shown at once, not behind the fold. */}
      {m.status === 'error' && m.content ? <p className="text-caption text-destructive">{m.content}</p> : null}
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
    </div>
  );
}

/** What the model thought before answering: folded away until asked for. */
function Thinking({ text, live }: { text: string; live?: boolean }) {
  return (
    <Collapsible className="w-full text-caption text-muted-foreground">
      <CollapsibleTrigger className="group flex items-center gap-1.5 py-1 font-semibold">
        <Brain className={cn('size-3.5', live && 'animate-pulse text-primary')} aria-hidden />
        {live ? 'Đang suy nghĩ…' : 'Suy nghĩ'}
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-h-48 overflow-auto whitespace-pre-wrap break-words border-l-2 pl-2.5">{text}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** A piece of the running turn that is not stored yet. */
function Live({ item, writing }: { item: LiveItem; writing: boolean }) {
  if (item.kind === 'reasoning') return <Thinking text={item.text} live={writing} />;
  if (item.kind === 'text')
    return (
      <Message>
        <MessageContent>
          <Bubble variant="outline" className="max-w-[92%]">
            <BubbleContent>
              <Markdown text={item.text} live />
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  const state = STATE[item.state === 'done' ? 'done' : 'running']!;
  return (
    <div className="flex w-full items-start gap-2 rounded-xl border bg-card px-3 py-2.5 text-small">
      <state.icon className={cn('mt-0.5 size-4 shrink-0', state.tone)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{item.text || item.name}</span>
        <span className="block text-caption text-muted-foreground">{state.label}</span>
      </span>
    </div>
  );
}

const dataOf = (m: AssistantMessage) => (m.data ?? {}) as { attachments?: AssistantAttachment[]; reasoning?: string; stopped?: boolean };

function Sent({ files }: { files: AssistantAttachment[] }) {
  return (
    <AttachmentGroup className="justify-end">
      {files.map((a) => (
        <Attachment key={a.path} size="sm" orientation={isPicture(a.mime) ? 'vertical' : 'horizontal'}>
          <AttachmentMedia variant={isPicture(a.mime) ? 'image' : 'icon'}>{isPicture(a.mime) ? <img src={attachmentUrl(a.path)} alt={a.name} /> : <FileText aria-hidden />}</AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{a.name}</AttachmentTitle>
          </AttachmentContent>
          <AttachmentTrigger asChild>
            <a href={attachmentUrl(a.path)} target="_blank" rel="noreferrer" aria-label={`Mở ${a.name}`} />
          </AttachmentTrigger>
        </Attachment>
      ))}
    </AttachmentGroup>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground"
      aria-label={done ? 'Đã chép' : 'Chép câu trả lời'}
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
    >
      {done ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
    </Button>
  );
}

export function AssistantMessages({ messages, running, live, onDecide, deciding }: { messages: AssistantMessage[]; running: boolean; live?: LiveTurn; onDecide: (id: number, approve: boolean) => void; deciding: boolean }) {
  const inputs = new Map(messages.flatMap((m) => m.toolCalls.map((c) => [c.id, c.args] as const)));
  const shown = messages.filter((m) => m.role !== 'assistant' || m.content.trim() || dataOf(m).reasoning || dataOf(m).stopped);
  const pending = running && live ? pendingItems(live, messages) : [];
  const last = pending.at(-1);
  // Something visibly moving already says the assistant is at work.
  const busy = last !== undefined && (last.kind !== 'tool' || last.state !== 'done');
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller>
        <MessageScrollerViewport aria-label="Tin nhắn">
          <MessageScrollerContent className="gap-3 px-3 py-4" role="log" aria-live="polite" aria-label="Cuộc trò chuyện với trợ lý">
            {[
              ...shown.map((m) => {
              const { attachments: files, reasoning, stopped } = dataOf(m);
              // A stored reply keeps the identity of the live item it replaces, so the screen does not rebuild (and jump) when it lands.
              const same = m.role === 'assistant' ? (m.data as { liveId?: string } | null)?.liveId : undefined;
              const id = same ? `text-${same}` : String(m.id);
              return (
                <MessageScrollerItem key={id} messageId={id}>
                  {m.role === 'user' ? (
                    <Message align="end">
                      <MessageContent className="items-end">
                        {files?.length ? <Sent files={files} /> : null}
                        {m.content ? (
                          <Bubble align="end" className="max-w-[85%]">
                            <BubbleContent className="whitespace-pre-wrap">{m.content}</BubbleContent>
                          </Bubble>
                        ) : null}
                      </MessageContent>
                    </Message>
                  ) : m.role === 'assistant' ? (
                    <Message>
                      <MessageContent className="gap-1">
                        {reasoning ? <Thinking text={reasoning} /> : null}
                        {m.content.trim() ? (
                          <Bubble variant={m.status === 'error' ? 'destructive' : 'outline'} className="max-w-[92%]">
                            <BubbleContent>
                              <Markdown text={m.content} />
                            </BubbleContent>
                          </Bubble>
                        ) : null}
                        {stopped ? <span className="text-caption text-muted-foreground">Đã dừng</span> : null}
                        {m.content.trim() ? (
                          <MessageFooter className="px-0">
                            <CopyButton text={m.content} />
                          </MessageFooter>
                        ) : null}
                      </MessageContent>
                    </Message>
                  ) : (
                    <ToolCard m={m} input={inputs.get(m.toolCallId ?? '')} deciding={deciding} onDecide={(approve) => onDecide(m.id, approve)} />
                  )}
                </MessageScrollerItem>
              );
              }),
              ...pending.map((item) => (
                <MessageScrollerItem key={`${item.kind}-${item.id}`} messageId={`${item.kind}-${item.id}`}>
                  <Live item={item} writing={item === last} />
                </MessageScrollerItem>
              )),
            ]}
            {running && !busy ? (
              <MessageScrollerItem messageId="running">
                <div role="status" className="flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-caption text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Trợ lý đang làm…
                </div>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
