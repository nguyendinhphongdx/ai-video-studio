'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { MAX_ATTACHMENTS } from '@/core/assistant/attachments';
import { errorMessage } from '@/lib/api/client';

import { assistantApi, type AssistantAttachment } from '../services/assistant.api';

export interface Chip {
  key: string;
  name: string;
  /** Object URL of a picture, for the thumbnail. */
  preview: string | null;
  /** Set once the server has the file. */
  saved: AssistantAttachment | null;
}

/** The files waiting to go with the next message: each is uploaded as soon as it is added. */
export function useAttachments(threadId: string | null, ensureThread: () => Promise<string>) {
  const [chips, setChips] = useState<Chip[]>([]);
  const count = useRef(0);
  count.current = chips.length;
  /** The conversation the chips were uploaded to; files do not move to another one. */
  const owner = useRef<string | null>(null);

  const drop = useCallback((keys: string[] | 'all') => {
    setChips((all) => {
      const gone = keys === 'all' ? all : all.filter((c) => keys.includes(c.key));
      for (const c of gone) if (c.preview) URL.revokeObjectURL(c.preview);
      return all.filter((c) => !gone.includes(c));
    });
  }, []);

  useEffect(() => {
    if (owner.current && owner.current !== threadId) drop('all');
  }, [threadId, drop]);

  const add = useCallback(
    async (files: File[]) => {
      const room = MAX_ATTACHMENTS - count.current;
      if (files.length > room) toast.error(`Mỗi tin tối đa ${MAX_ATTACHMENTS} tệp.`);
      const next = files.slice(0, Math.max(0, room)).map((file) => ({ file, chip: { key: crypto.randomUUID(), name: file.name, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null, saved: null } as Chip }));
      if (!next.length) return;
      count.current += next.length;
      setChips((all) => [...all, ...next.map((n) => n.chip)]);
      try {
        const id = await ensureThread();
        owner.current = id;
        await Promise.all(
          next.map(async ({ file, chip }) => {
            try {
              const saved = await assistantApi.upload(id, file);
              setChips((all) => all.map((c) => (c.key === chip.key ? { ...c, saved } : c)));
            } catch (e) {
              toast.error(`${file.name}: ${errorMessage(e)}`);
              drop([chip.key]);
            }
          }),
        );
      } catch (e) {
        toast.error(errorMessage(e));
        drop(next.map((n) => n.chip.key));
      }
    },
    [ensureThread, drop],
  );

  return { chips, add, remove: (key: string) => drop([key]), clear: () => drop('all'), uploading: chips.some((c) => !c.saved) };
}
