'use client';

import { Loader2, Save, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Appears while the rules have unsaved edits. Saving never changes episodes already written: it creates the next version. */
export function RulesBar({ nextVersion, blocked, saving, onSave, onDiscard }: { nextVersion: number; blocked: string | null; saving: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div role="region" aria-label="Lưu thay đổi" className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-lift">
      <div className="min-w-0 flex-1 text-small">
        <div className="font-bold">Có thay đổi chưa lưu</div>
        <div className="text-muted-foreground">{blocked ?? `Lưu sẽ tạo phiên bản v${nextVersion}. Các tập đã viết giữ nguyên phiên bản cũ.`}</div>
      </div>
      <Button variant="outline" onClick={onDiscard} disabled={saving}>
        <Undo2 aria-hidden />
        Bỏ thay đổi
      </Button>
      <Button onClick={onSave} disabled={saving || Boolean(blocked)}>
        {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
        Lưu v{nextVersion}
      </Button>
    </div>
  );
}
