'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAssistantStore } from '@/stores/assistant-store';

/**
 * A shortcut to the one assistant: opens a popup with a ready-made request about this item, the person edits it,
 * and sending hands it to the assistant panel. There is no separate AI behind it.
 */
export function AskAiButton({ title, prompt, label = 'AI' }: { title: string; prompt: string; label?: string }) {
  const ask = useAssistantStore((s) => s.ask);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(prompt);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => {
          setText(prompt);
          setOpen(true);
        }}
      >
        <Sparkles className="size-3.5" aria-hidden />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Yêu cầu đã điền sẵn từ hiện trạng. Sửa lại theo ý bạn rồi gửi cho trợ lý.</DialogDescription>
          </DialogHeader>
          <Textarea aria-label="Yêu cầu gửi trợ lý" rows={10} value={text} onChange={(e) => setText(e.target.value)} className="text-small" />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Huỷ</Button>
            </DialogClose>
            <Button
              disabled={!text.trim()}
              onClick={() => {
                ask(text.trim());
                setOpen(false);
              }}
            >
              <Sparkles aria-hidden />
              Gửi cho trợ lý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
