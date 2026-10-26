'use client';

import { ArrowDown, ArrowUp, Lock, Play, Square, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { Scene } from '@/core/domain/episode';
import { estimateSpeechSec } from '@/core/timeline';
import type { SceneBrand } from '@video/primitives';

import { fmtDuration } from '../../lib/status';
import { sceneSeconds, type blockIndex } from '../../lib/preview';
import type { EpisodeView } from '../../services/episode.api';
import { ScenePlayer } from '../preview';

import { FieldInput } from './FieldInput';

interface Props {
  scene: Scene | null;
  ordinal: number;
  slot: EpisodeView['slots'][number] | undefined;
  blocks: ReturnType<typeof blockIndex>;
  brand: SceneBrand;
  editable: boolean;
  voice: { play: (s: Scene) => void; playing: string | null; loading: string | null; narrationSrc: string | null };
  onChange: (patch: Partial<Scene>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function SceneEditor({ scene, ordinal, slot, blocks, brand, editable, voice, onChange, onMove, onRemove, onClose }: Props) {
  const block = scene ? blocks.get(scene.block) : undefined;
  const readOnly = !editable || Boolean(scene?.locked);
  const switchBlock = (ref: string) => {
    if (!scene) return;
    const next = blocks.get(ref);
    if (!next) return;
    // Keep values for fields the two blocks share (heading, emoji...), defaults for the rest.
    const props = Object.fromEntries(Object.entries(next.defaults).map(([k, v]) => [k, k in scene.props ? scene.props[k] : v]));
    onChange({ block: ref, props });
  };
  return (
    <Sheet open={Boolean(scene)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {scene ? (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2">
                {slot?.name ?? 'Cảnh'}
                {scene.locked ? (
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-caption font-semibold text-muted-foreground">
                    <Lock className="size-3" aria-hidden />
                    Khoá theo series
                  </span>
                ) : null}
              </SheetTitle>
              <SheetDescription>
                @{scene.block} · ~{fmtDuration(sceneSeconds(scene, blocks))}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              {block?.previewable !== false ? (
                <ScenePlayer block={scene.block} props={scene.props} ordinal={ordinal} brand={brand} durationSec={sceneSeconds(scene, blocks)} narrationSrc={voice.narrationSrc} />
              ) : (
                <div className="grid aspect-video place-items-center rounded-lg bg-muted text-small text-muted-foreground">@{scene.block}: xem sau khi dựng</div>
              )}
              {slot && slot.blocks.length > 1 && !readOnly ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="scene-block" className="text-small">
                    Khối dựng
                  </Label>
                  <Select value={scene.block} onValueChange={switchBlock}>
                    <SelectTrigger id="scene-block" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {slot.blocks.map((ref) => (
                        <SelectItem key={ref} value={ref}>
                          {blocks.get(ref)?.name ?? ref} · @{ref}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <fieldset disabled={readOnly} className="flex flex-col gap-4 disabled:opacity-70">
                {(block?.fields ?? []).map((f) => (
                  <FieldInput key={f.key} id={`f-${f.key}`} field={f} value={scene.props[f.key]} onChange={(v) => onChange({ props: { ...scene.props, [f.key]: v } })} />
                ))}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="f-narration" className="text-small">
                      Lời đọc
                    </Label>
                    <span className="text-caption text-muted-foreground">~{fmtDuration(estimateSpeechSec(scene.narration))} · viết số bằng chữ</span>
                  </div>
                  <Textarea id="f-narration" rows={3} value={scene.narration} onChange={(e) => onChange({ narration: e.target.value })} />
                </div>
              </fieldset>
              <Button variant="outline" className="w-fit" onClick={() => voice.play(scene)} disabled={voice.loading === scene.id || !scene.narration.trim()}>
                {voice.playing === scene.id ? <Square aria-hidden /> : <Play aria-hidden />}
                {voice.loading === scene.id ? 'Đang tạo giọng…' : voice.playing === scene.id ? 'Dừng' : 'Nghe thử lời đọc'}
              </Button>
            </div>
            <SheetFooter className="flex-row items-center gap-2 border-t">
              {!readOnly ? (
                <>
                  <Button variant="ghost" size="icon" aria-label="Lên trước" onClick={() => onMove(-1)}>
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Xuống sau" onClick={() => onMove(1)}>
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button variant="ghost" className="text-destructive" onClick={onRemove}>
                    <Trash2 aria-hidden />
                    Xoá cảnh
                  </Button>
                </>
              ) : null}
              <Button className="ml-auto" onClick={onClose}>
                Xong
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
