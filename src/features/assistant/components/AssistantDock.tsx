'use client';

import { History, Plus, Send, Shield, ShieldAlert, ShieldCheck, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES } from '@/constants/routes';
import { useAppConfig, useCurrentChannel } from '@/features/app';
import { cn } from '@/lib/utils';
import { useAssistantStore } from '@/stores/assistant-store';

import { useAssistantActions, useFocus, useThread } from '../hooks/use-assistant';
import { MODE_INFO, type PermissionMode } from '../services/assistant.api';

import { AssistantMessages } from './AssistantMessages';

const MODE_ICON: Record<PermissionMode, typeof Shield> = { ask: ShieldCheck, auto: Shield, bypass: ShieldAlert };

/** Starting points that depend on where the person is. They only send a message; the assistant does the work. */
function suggestions(route: string, hasEpisode: boolean, hasSeries: boolean, designed: boolean): string[] {
  if (/^\/channels\//.test(route)) return designed ? ['Sửa thiết kế mở đầu của kênh: chữ to hơn, nền tối hơn', 'Soạn tri thức nền cho kênh này', 'Soạn một skill riêng cho loại video chính của kênh'] : ['Thiết kế mở đầu và kết riêng cho kênh này', 'Soạn tri thức nền cho kênh này', 'Gợi ý bảng màu, font và phong cách ảnh hợp với kênh'];
  if (hasEpisode) return ['Tạo ảnh và giọng cho các cảnh còn thiếu', 'Duyệt các cảnh đã đủ ảnh và giọng', 'Sửa lời đọc cho tự nhiên và ngắn gọn hơn', 'Tình trạng video này đang thế nào?'];
  if (hasSeries) return ['Viết kịch bản cho các tập tiếp theo', 'Thêm 5 tập vào lộ trình', 'Tình trạng series này đang thế nào?'];
  if (/^\/skills/.test(route)) return ['Cài skill phù hợp từ market cho kênh', 'Soạn skill mới cho kênh từ tri thức của kênh'];
  return ['Tạo một video về một chủ đề mới', 'Lập series 10 tập cho kênh', 'Kênh mình còn thiếu gì để làm video?'];
}

export function AssistantDock() {
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);
  const queued = useAssistantStore((s) => s.queued);
  const clearQueued = useAssistantStore((s) => s.clearQueued);
  const { current } = useCurrentChannel();
  const { data: config } = useAppConfig();
  const focus = useFocus();
  const { threadId, threads, view, loading } = useThread(current?.id);
  const [draftMode, setDraftMode] = useState<PermissionMode>('auto');
  const mode = view?.thread.mode ?? draftMode;
  const { send, decide, setMode, create } = useAssistantActions(current?.id, threadId, mode);
  const [text, setText] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const aiReady = config?.llm.ready ?? false;
  const running = Boolean(view?.running) || send.isPending;
  const waiting = view?.awaiting != null;

  // Pushes the page aside on wide screens so the assistant sits next to the work instead of covering it.
  useEffect(() => {
    document.documentElement.dataset.assistant = open ? 'open' : 'closed';
  }, [open]);
  useEffect(() => {
    if (open) box.current?.focus();
  }, [open]);
  useEffect(() => {
    if (queued && open && current && aiReady && !running) {
      send.mutate(queued);
      clearQueued();
    }
  }, [queued, open, current, aiReady, running]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (value = text) => {
    const t = value.trim();
    if (!t || running || !current || !aiReady) return;
    send.mutate(t, { onSuccess: () => setText('') });
  };
  const chips = useMemo(
    () => suggestions(focus.route, Boolean(focus.episodeId), Boolean(focus.seriesId), Boolean(current?.introDesign && current?.outroDesign)),
    [focus.route, focus.episodeId, focus.seriesId, current?.introDesign, current?.outroDesign],
  );
  const ModeIcon = MODE_ICON[mode];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở trợ lý"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6"
      >
        <Sparkles className="size-6" aria-hidden />
        {waiting ? <span className="absolute right-0 top-0 size-3.5 rounded-full border-2 border-white bg-warning" aria-label="Có việc chờ bạn đồng ý" /> : null}
      </button>
    );
  }

  return (
    <aside aria-label="Trợ lý" className="fixed inset-0 z-50 flex flex-col bg-background md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:border-l md:shadow-lift">
      <header className="flex items-center gap-2 border-b bg-card px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-small font-bold leading-tight">Trợ lý</div>
          <div className="truncate text-caption text-muted-foreground">{current ? `Kênh ${current.name}` : 'Chưa có kênh'}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" aria-label={`Chế độ quyền: ${MODE_INFO[mode].label}`}>
              <ModeIcon className={cn('size-4', mode === 'bypass' && 'text-warning')} aria-hidden />
              {MODE_INFO[mode].label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Khi trợ lý làm thay bạn</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={mode} onValueChange={(v) => (threadId ? setMode.mutate(v as PermissionMode) : setDraftMode(v as PermissionMode))}>
              {(Object.keys(MODE_INFO) as PermissionMode[]).map((m) => (
                <DropdownMenuRadioItem key={m} value={m} className="flex-col items-start gap-0.5">
                  <span className="font-semibold">{MODE_INFO[m].label}</span>
                  <span className="text-caption text-muted-foreground">{MODE_INFO[m].hint}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Các cuộc trò chuyện">
              <History aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-auto">
            <DropdownMenuItem onSelect={() => current && create.mutate(mode)}>
              <Plus className="size-4" aria-hidden />
              Cuộc trò chuyện mới
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {threads.length ? (
              threads.map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => current && useAssistantStore.getState().setThread(current.id, t.id)} className={cn(t.id === threadId && 'font-semibold')}>
                  <span className="truncate">{t.title || 'Cuộc trò chuyện trống'}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-2 text-caption text-muted-foreground">Chưa có cuộc trò chuyện nào</div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" aria-label="Đóng trợ lý" onClick={() => setOpen(false)}>
          <X aria-hidden />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        {!aiReady ? (
          <div className="mb-4 rounded-xl border border-warning/40 bg-warning-soft p-3 text-small">
            Chưa cài AI nên trợ lý chưa trả lời được.{' '}
            <Link href={ROUTES.settings} onClick={() => setOpen(false)} className="font-semibold text-primary hover:underline">
              Cài AI ở trang Cài đặt
            </Link>
          </div>
        ) : null}
        {!current ? <p className="text-small text-muted-foreground">Tạo hoặc chọn một kênh để bắt đầu. Trợ lý làm việc trong từng kênh.</p> : null}
        {current && !loading && !view?.messages.length ? (
          <div className="flex flex-col gap-3">
            <p className="text-small text-slate-700">
              Mình làm được mọi việc trong studio: thiết kế intro/outro, soạn tri thức và skill, lập series, tạo video, sửa từng cảnh, tạo ảnh và giọng, duyệt và sản xuất. Bạn cứ nói bằng lời.
            </p>
            <div className="flex flex-col gap-2">
              {chips.map((c) => (
                <button key={c} type="button" disabled={!aiReady || running} onClick={() => submit(c)} className="rounded-xl border bg-card px-3 py-2.5 text-left text-small hover:border-primary hover:bg-accent disabled:opacity-50">
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {view ? <AssistantMessages messages={view.messages} running={running} deciding={decide.isPending} onDecide={(messageId, approve) => decide.mutate({ messageId, approve })} /> : null}
      </div>

      <form
        className="border-t bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {waiting ? <p className="mb-2 text-caption text-warning">Trợ lý đang chờ bạn đồng ý ở trên. Gõ tin mới sẽ bỏ yêu cầu đó.</p> : null}
        <div className="flex items-end gap-2">
          <Textarea
            ref={box}
            value={text}
            rows={1}
            disabled={!current || !aiReady}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={focus.episodeId ? 'Nhờ trợ lý về video/cảnh này…' : 'Nhờ trợ lý làm gì đó…'}
            aria-label="Tin nhắn cho trợ lý"
            className="max-h-32 min-h-11 resize-none"
          />
          <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!text.trim() || running || !current || !aiReady} aria-label="Gửi">
            <Send aria-hidden />
          </Button>
        </div>
      </form>
    </aside>
  );
}
