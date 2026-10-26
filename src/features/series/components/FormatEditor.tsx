'use client';

import { ArrowDown, ArrowUp, Lock, Plus, Sparkles, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { lintFormat, type EpisodeFormat, type Slot } from '@/core/series/format';
import { FieldInput } from '@/features/episode/components/storyboard/FieldInput';
import type { ToolInfo } from '@/features/episode/services/episode.api';
import { cn } from '@/lib/utils';

const WHEN: Record<Slot['when'], string> = { always: 'Luôn có', first: 'Chỉ tập 1', 'not-first': 'Từ tập 2' };
const VARS = '{n} {topic} {next_topic} {series} {title} {channel}';

function newSlotId(format: EpisodeFormat): string {
  const ids = new Set(format.slots.map((s) => s.id));
  for (let i = format.slots.length + 1; ; i++) if (!ids.has(`khe-${i}`)) return `khe-${i}`;
}

function NumberInput({ id, value, min, max, onChange }: { id: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return <Input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Math.round(Number(e.target.value) || min))))} className="w-20" />;
}

function BlockChips({ slot, tools, onChange }: { slot: Slot; tools: ToolInfo[]; onChange: (blocks: string[]) => void }) {
  const toggle = (toolId: string, ref: string, toolRefs: string[]) => {
    const whole = slot.blocks.includes(toolId);
    const current = whole ? [...slot.blocks.filter((b) => b !== toolId), ...toolRefs] : slot.blocks;
    onChange(current.includes(ref) ? current.filter((b) => b !== ref) : [...current, ref]);
  };
  return (
    <div className="flex flex-col gap-2">
      {tools.map((t) => {
        const refs = t.blocks.map((b) => b.ref);
        return (
          <div key={t.id} className="flex flex-wrap items-center gap-1.5">
            <span className="w-24 shrink-0 text-caption font-semibold text-muted-foreground">@{t.id}</span>
            {t.blocks.map((b) => {
              const on = slot.blocks.includes(b.ref) || slot.blocks.includes(t.id);
              return (
                <button
                  key={b.ref}
                  type="button"
                  aria-pressed={on}
                  title={b.summary}
                  onClick={() => toggle(t.id, b.ref, refs)}
                  className={cn('min-h-8 rounded-full border px-3 text-caption font-semibold transition', on ? 'border-primary bg-accent text-accent-foreground' : 'bg-card text-slate-700 hover:border-slate-400')}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function SlotCard({ slot, index, count, tools, onChange, onMove, onRemove }: { slot: Slot; index: number; count: number; tools: ToolInfo[]; onChange: (s: Slot) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  const set = (patch: Partial<Slot>) => onChange({ ...slot, ...patch });
  const locked = slot.fill === 'locked';
  const allBlocks = tools.flatMap((t) => t.blocks);
  const lockedBlock = slot.locked ? allBlocks.find((b) => b.ref === slot.locked!.block) : undefined;
  const id = `slot-${slot.id}`;
  return (
    <section aria-label={`Khe ${slot.name}`} className={cn('flex flex-col gap-4 rounded-2xl border p-4 md:p-5', locked ? 'border-dashed bg-muted/40' : 'border-primary/40 bg-card')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-muted text-caption font-bold">{index + 1}</span>
        <Label htmlFor={`${id}-name`} className="sr-only">
          Tên khe
        </Label>
        <Input id={`${id}-name`} value={slot.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} className="h-9 w-44 font-bold" />
        <code className="text-caption text-muted-foreground">{slot.id}</code>
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Lên trên" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Xuống dưới" disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Xoá khe ${slot.name}`} disabled={count <= 1} onClick={onRemove}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Ai điền khe này" className="flex rounded-full border p-0.5">
          <button type="button" aria-pressed={locked} onClick={() => !locked && set({ fill: 'locked', locked: slot.locked ?? { block: allBlocks[0]?.ref ?? '', narration: '', props: allBlocks[0]?.defaults ?? {} }, scenes: { min: 1, max: 1 } })} className={cn('flex min-h-8 items-center gap-1.5 rounded-full px-3 text-small font-semibold', locked ? 'bg-foreground text-background' : 'text-muted-foreground')}>
            <Lock className="size-3.5" aria-hidden />
            Khoá
          </button>
          <button type="button" aria-pressed={!locked} onClick={() => locked && set({ fill: 'ai', blocks: slot.blocks.length ? slot.blocks : allBlocks.slice(0, 1).map((b) => b.ref) })} className={cn('flex min-h-8 items-center gap-1.5 rounded-full px-3 text-small font-semibold', !locked ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <Sparkles className="size-3.5" aria-hidden />
            AI điền
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`${id}-when`} className="text-small text-muted-foreground">
            Xuất hiện
          </Label>
          <Select value={slot.when} onValueChange={(v) => set({ when: v as Slot['when'] })}>
            <SelectTrigger id={`${id}-when`} className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(WHEN).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!locked ? (
          <div className="flex items-center gap-2 text-small text-muted-foreground">
            <Label htmlFor={`${id}-min`}>Số cảnh</Label>
            <NumberInput id={`${id}-min`} value={slot.scenes.min} min={0} max={20} onChange={(n) => set({ scenes: { ...slot.scenes, min: n } })} />
            <span aria-hidden>–</span>
            <Label htmlFor={`${id}-max`} className="sr-only">
              Số cảnh tối đa
            </Label>
            <NumberInput id={`${id}-max`} value={slot.scenes.max} min={1} max={20} onChange={(n) => set({ scenes: { ...slot.scenes, max: n } })} />
          </div>
        ) : null}
      </div>

      {locked && slot.locked ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={`${id}-block`} className="text-small">
              Khối
            </Label>
            <Select value={slot.locked.block} onValueChange={(ref) => set({ locked: { ...slot.locked!, block: ref, props: allBlocks.find((b) => b.ref === ref)?.defaults ?? {} } })}>
              <SelectTrigger id={`${id}-block`} className="h-9 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allBlocks.map((b) => (
                  <SelectItem key={b.ref} value={b.ref}>
                    {b.name} · @{b.ref}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-narr`}>Lời đọc (nguyên văn, AI không sửa)</Label>
            <Textarea id={`${id}-narr`} rows={2} maxLength={600} value={slot.locked.narration} onChange={(e) => set({ locked: { ...slot.locked!, narration: e.target.value } })} />
            <p className="text-caption text-muted-foreground">Biến: {VARS}</p>
          </div>
          {lockedBlock ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {lockedBlock.fields.map((f) => (
                <FieldInput key={f.key} id={`${id}-p-${f.key}`} field={f} value={slot.locked!.props[f.key]} onChange={(v) => set({ locked: { ...slot.locked!, props: { ...slot.locked!.props, [f.key]: v } } })} />
              ))}
            </div>
          ) : (
            <p className="text-small text-destructive">Khối này không còn tồn tại, chọn khối khác.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-small font-semibold">Khối AI được dùng</span>
            <BlockChips slot={slot} tools={tools} onChange={(blocks) => set({ blocks })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-guide`}>Hướng dẫn riêng cho AI ở khe này</Label>
            <Textarea id={`${id}-guide`} rows={3} maxLength={600} value={slot.guide} onChange={(e) => set({ guide: e.target.value })} placeholder="Ví dụ: Mỗi cảnh một số theo thứ tự. Lời đọc đếm to “một, hai, ba…”." />
          </div>
        </div>
      )}
    </section>
  );
}

/** Edits the episode format: ordered slots, each locked (fixed text) or filled by the AI within limits. */
export function FormatEditor({ value, onChange, tools }: { value: EpisodeFormat; onChange: (v: EpisodeFormat) => void; tools: ToolInfo[] | undefined }) {
  const errors = lintFormat(value);
  const usable = tools ?? [];
  const setSlot = (i: number, s: Slot) => onChange({ ...value, slots: value.slots.map((x, j) => (j === i ? s : x)) });
  const move = (i: number, dir: -1 | 1) => {
    const slots = [...value.slots];
    const [item] = slots.splice(i, 1);
    slots.splice(i + dir, 0, item!);
    onChange({ ...value, slots });
  };
  const add = () =>
    onChange({
      ...value,
      slots: [...value.slots, { id: newSlotId(value), name: 'Phần mới', fill: 'ai', when: 'always', blocks: usable[0]?.blocks.slice(0, 1).map((b) => b.ref) ?? [], scenes: { min: 1, max: 2 }, guide: '' }],
    });
  const duration = value.durationSec;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <label className="flex items-center gap-2 text-small font-semibold">
          <input type="checkbox" checked={duration !== null} onChange={(e) => onChange({ ...value, durationSec: e.target.checked ? { min: 60, max: 120 } : null })} className="size-4 accent-primary" />
          Giới hạn thời lượng một tập
        </label>
        {duration ? (
          <div className="flex items-center gap-2 text-small text-muted-foreground">
            <NumberInput id="dur-min" value={duration.min} min={5} max={3600} onChange={(n) => onChange({ ...value, durationSec: { ...duration, min: n } })} />
            <span aria-hidden>–</span>
            <NumberInput id="dur-max" value={duration.max} min={5} max={3600} onChange={(n) => onChange({ ...value, durationSec: { ...duration, max: n } })} />
            giây
          </div>
        ) : (
          <span className="text-small text-muted-foreground">Không giới hạn</span>
        )}
      </div>
      {errors.length ? (
        <ul role="alert" className="list-disc rounded-xl bg-danger-soft py-3 pl-8 pr-4 text-small text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-col gap-3">
        {value.slots.map((s, i) => (
          <SlotCard key={s.id} slot={s} index={i} count={value.slots.length} tools={usable} onChange={(next) => setSlot(i, next)} onMove={(d) => move(i, d)} onRemove={() => onChange({ ...value, slots: value.slots.filter((_, j) => j !== i) })} />
        ))}
      </div>
      <Button type="button" variant="outline" className="w-fit" onClick={add}>
        <Plus aria-hidden />
        Thêm phần
      </Button>
    </div>
  );
}
