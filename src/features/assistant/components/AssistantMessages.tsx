'use client';

import { Check, ChevronRight, CircleAlert, CircleCheck, Copy, FileText, Loader2, ShieldQuestion, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Attachment, AttachmentContent, AttachmentGroup, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from '@/components/ui/attachment';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Message, MessageContent, MessageFooter } from '@/components/ui/message';
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from '@/components/ui/message-scroller';
import { isPicture } from '@/core/assistant/attachments';
import { cn } from '@/lib/utils';

import { attachmentUrl, type AssistantAttachment, type AssistantMessage } from '../services/assistant.api';

import { RichText } from './RichText';

const RISK_LABEL: Record<string, string> = { write: 'Ghi dữ liệu', paid: 'Tốn tiền hoặc chạy lâu', destructive: 'Xoá' };
const STATE: Record<string, { label: string; icon: typeof CircleCheck; tone: string }> = {
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

export function AssistantMessages({ messages, running, onDecide, deciding }: { messages: AssistantMessage[]; running: boolean; onDecide: (id: number, approve: boolean) => void; deciding: boolean }) {
  const inputs = new Map(messages.flatMap((m) => m.toolCalls.map((c) => [c.id, c.args] as const)));
  const shown = messages.filter((m) => m.role !== 'assistant' || m.content.trim());
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller>
        <MessageScrollerViewport aria-label="Tin nhắn">
          <MessageScrollerContent className="gap-3 px-3 py-4" role="log" aria-live="polite" aria-label="Cuộc trò chuyện với trợ lý">
            {shown.map((m) => {
              const files = (m.data as { attachments?: AssistantAttachment[] } | null)?.attachments;
              return (
                <MessageScrollerItem key={m.id} messageId={String(m.id)} scrollAnchor={m.role === 'user'}>
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
                        <Bubble variant={m.status === 'error' ? 'destructive' : 'outline'} className="max-w-[92%]">
                          <BubbleContent>
                            <RichText text={m.content} />
                          </BubbleContent>
                        </Bubble>
                        <MessageFooter className="px-0">
                          <CopyButton text={m.content} />
                        </MessageFooter>
                      </MessageContent>
                    </Message>
                  ) : (
                    <ToolCard m={m} input={inputs.get(m.toolCallId ?? '')} deciding={deciding} onDecide={(approve) => onDecide(m.id, approve)} />
                  )}
                </MessageScrollerItem>
              );
            })}
            {running ? (
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
