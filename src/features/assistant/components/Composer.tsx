'use client';

import { FileText, ImagePlus, Loader2, Plus, Send, X } from 'lucide-react';
import { useRef, type RefObject } from 'react';

import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentGroup, AttachmentMedia, AttachmentTitle } from '@/components/ui/attachment';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import { ATTACHMENT_ACCEPT } from '@/core/assistant/attachments';

import type { Chip } from '../hooks/use-attachments';

interface Props {
  box: RefObject<HTMLTextAreaElement | null>;
  text: string;
  onText: (text: string) => void;
  chips: Chip[];
  onFiles: (files: File[]) => void;
  onRemove: (key: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled: boolean;
  canSend: boolean;
  sending: boolean;
}

/** The message box: type, attach from the menu, paste or drop (drop is caught by the whole panel), send. */
export function Composer({ box, text, onText, chips, onFiles, onRemove, onSubmit, placeholder, disabled, canSend, sending }: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const pick = (accept: string) => {
    if (!picker.current) return;
    picker.current.accept = accept;
    picker.current.click();
  };
  return (
    <>
      <input ref={picker} type="file" multiple className="sr-only" tabIndex={-1} onChange={(e) => (onFiles([...(e.target.files ?? [])]), (e.target.value = ''))} />
      <InputGroup className="bg-background">
        {chips.length ? (
          <InputGroupAddon align="block-start">
            <AttachmentGroup>
              {chips.map((c) => (
                <Attachment key={c.key} size="sm" state={c.saved ? 'done' : 'uploading'}>
                  <AttachmentMedia variant={c.preview ? 'image' : 'icon'}>{c.preview ? <img src={c.preview} alt="" /> : <FileText aria-hidden />}</AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle className="max-w-32">{c.name}</AttachmentTitle>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction aria-label={`Bỏ ${c.name}`} onClick={() => onRemove(c.key)}>
                      <X aria-hidden />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            </AttachmentGroup>
          </InputGroupAddon>
        ) : null}
        <InputGroupTextarea
          ref={box}
          value={text}
          rows={1}
          disabled={disabled}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSubmit();
            }
          }}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (!files.length) return; // plain text pastes as usual
            e.preventDefault();
            onFiles(files);
          }}
          placeholder={placeholder}
          aria-label="Tin nhắn cho trợ lý"
          className="max-h-32 min-h-11"
        />
        <InputGroupAddon align="block-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton variant="outline" size="icon-sm" className="rounded-full" disabled={disabled} aria-label="Đính kèm">
                <Plus aria-hidden />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem onSelect={() => pick('image/png,image/jpeg,image/webp')}>
                <ImagePlus className="size-4" aria-hidden />
                Thêm ảnh
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => pick(ATTACHMENT_ACCEPT)}>
                <FileText className="size-4" aria-hidden />
                Thêm tệp (ảnh, TXT, MD)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <InputGroupButton variant="default" size="icon-sm" className="ml-auto rounded-full" disabled={!canSend} onClick={onSubmit} aria-label="Gửi">
            {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </>
  );
}
