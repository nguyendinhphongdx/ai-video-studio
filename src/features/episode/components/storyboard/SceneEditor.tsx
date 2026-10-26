'use client';

import { ArrowDown, ArrowUp, CircleCheck, ImageIcon, Loader2, Lock, Trash2, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AskAiButton } from '@/features/assistant/components/AskAiButton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { Scene } from '@/core/domain/episode';
import { estimateSpeechSec } from '@/core/timeline';
import type { SceneBrand } from '@video/primitives';

import { fmtDuration } from '../../lib/status';
import { sceneSeconds, type blockIndex } from '../../lib/preview';
import type { EpisodeView, SceneAssetView } from '../../services/episode.api';
import { ScenePlayer } from '../preview';

import { FieldInput } from './FieldInput';

interface Props {
  scene: Scene | null;
  ordinal: number;
  /** Position of the scene in the whole video (1-based), for wording. */
  position: number;
  slot: EpisodeView['slots'][number] | undefined;
  blocks: ReturnType<typeof blockIndex>;
  brand: SceneBrand;
  editable: boolean;
  assets: SceneAssetView | undefined;
  working: boolean;
  onGenerate: (what: 'image' | 'voice') => void;
  onApprove: (approved: boolean) => void;
  onChange: (patch: Partial<Scene>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function SceneEditor({ scene, ordinal, position, slot, blocks, brand, editable, assets, working, onGenerate, onApprove, onChange, onMove, onRemove, onClose }: Props) {
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
              {editable && !readOnly ? (
                <div className="flex justify-end">
                  <AskAiButton
                    title={`Nhờ AI làm lại cảnh ${position}`}
                    prompt={`Làm lại cảnh ${position} của video này (dùng edit_scene, chỉ sửa cảnh này, giữ nguyên các cảnh khác).\nLời đọc hiện tại: "${scene.narration}"\nKhối: @${scene.block}. Nội dung hiện tại: ${JSON.stringify(scene.props).slice(0, 400)}\n\nMuốn đổi: [ví dụ: lời đọc cuốn hơn và có mồi sang cảnh sau, đổi bố cục/kiểu khung hình, mô tả ảnh cụ thể hơn].`}
                  />
                </div>
              ) : null}
              {block?.previewable !== false ? (
                <ScenePlayer block={scene.block} props={assets?.imageUrl ? { ...scene.props, image: assets.imageUrl } : scene.props} ordinal={ordinal} brand={brand} durationSec={sceneSeconds(scene, blocks, assets?.voiceSeconds ? new Map([[scene.id, { url: '', seconds: assets.voiceSeconds }]]) : undefined)} narrationSrc={assets?.voiceUrl ?? null} />
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
              <section className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-3" aria-label="Ảnh, giọng đọc và duyệt cảnh">
                {assets?.needsImage ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 text-small font-semibold">
                      Ảnh AI
                      <span className={assets.imageUrl ? 'text-success' : assets.imageStale ? 'text-warning' : 'text-muted-foreground'}>{assets.imageUrl ? 'Đã có' : assets.imageStale ? 'Mô tả đã đổi, cần tạo lại' : 'Chưa tạo'}</span>
                    </div>
                    {assets.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assets.imageUrl} alt="Ảnh đã tạo cho cảnh" className="aspect-video w-full rounded-lg border object-cover" />
                    ) : null}
                    {editable ? (
                      <Button variant="outline" size="sm" className="w-fit" disabled={working} onClick={() => onGenerate('image')}>
                        {working ? <Loader2 className="animate-spin" aria-hidden /> : <ImageIcon aria-hidden />}
                        {assets.imageUrl ? 'Tạo lại ảnh' : 'Tạo ảnh'}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {assets?.needsVoice ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 text-small font-semibold">
                      Giọng đọc
                      <span className={assets.voiceUrl ? 'text-success' : assets.voiceStale ? 'text-warning' : 'text-muted-foreground'}>{assets.voiceUrl ? `Đã có (${assets.voiceSeconds?.toFixed(1)} giây)` : assets.voiceStale ? 'Lời đọc đã đổi, cần tạo lại' : 'Chưa tạo'}</span>
                    </div>
                    {assets.voiceUrl ? <audio controls src={assets.voiceUrl} className="w-full" /> : null}
                    {editable ? (
                      <Button variant="outline" size="sm" className="w-fit" disabled={working} onClick={() => onGenerate('voice')}>
                        {working ? <Loader2 className="animate-spin" aria-hidden /> : <Volume2 aria-hidden />}
                        {assets.voiceUrl ? 'Tạo lại giọng' : 'Tạo giọng'}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {editable ? (
                  scene.approved ? (
                    <Button variant="outline" className="w-fit" disabled={working} onClick={() => onApprove(false)}>
                      <CircleCheck aria-hidden />
                      Đã duyệt · bỏ duyệt
                    </Button>
                  ) : (
                    <Button className="w-fit" disabled={working || !assets?.ready} onClick={() => onApprove(true)}>
                      <CircleCheck aria-hidden />
                      Duyệt cảnh này
                    </Button>
                  )
                ) : null}
                <p className="text-caption text-muted-foreground">Sửa lời đọc hoặc nội dung cảnh thì ảnh/giọng cũ không còn khớp: tạo lại rồi duyệt lại. Chỉ khi duyệt hết các cảnh mới ghép thành video.</p>
              </section>
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
