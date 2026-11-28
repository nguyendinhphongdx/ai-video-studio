'use client';

// The properties of the one layer that is selected: only the knobs that kind of layer has.
import { EXTRA_ACTIONS, EXTRA_EMOTIONS, EXTRA_ENTERS, ITEM_MOTIONS, MAX_HOLD_SEC, MAX_VOICE_DELAY_SEC, tuneOf, type Extra, type Placement, type TimedKey, type TuneLayer } from '@/core/domain/tune';

import { CastPicker, Chips, Section, Slider } from './controls';
import { ACTION_NAME, ChoiceSection, EMOTION_NAME, PictureTab, SfxSection, TextTab, VoiceSections, type TabProps } from './Tabs';
import type { LayerId } from './Timeline';

const ENTER_NAME = { fade: 'Hiện dần', left: 'Đi vào từ trái', right: 'Đi vào từ phải', pop: 'Bật ra' } as const;
const MOTION_NAME = { float: 'Lơ lửng', still: 'Đứng yên', spin: 'Xoay tròn' } as const;
const NAME: Record<string, string> = { picture: 'Hình', hero: 'Vai chính', companion: 'Nhân vật phụ', item: 'Vật phẩm', camera: 'Máy quay', effect: 'Hiệu ứng hình', transition: 'Chuyển cảnh', caption: 'Chữ', voice: 'Giọng đọc', sfx: 'Tiếng động', hold: 'Nghỉ cuối' };

const options = <T extends string>(values: readonly T[], names: Record<T, string>) => values.map((value) => ({ value, label: names[value] }));
const pct = (n: number) => `${Math.round(n * 100)}%`;
const tenth = (n: number) => Math.round(n * 10) / 10;

interface Props {
  p: TabProps;
  layer: LayerId;
  people: string[];
  things: string[];
  seconds: number;
  voiceUrl: string | null;
  writing: boolean;
  onWrite: () => void;
  onReplay: () => void;
  onSelect: (layer: LayerId | null) => void;
}

/** When the layer comes and goes. Reaching the end of the scene keeps it to the end however long the scene gets. */
function When({ from, to, seconds, disabled, onChange, onReset }: { from: number; to: number; seconds: number; disabled: boolean; onChange: (from: number, to: number) => void; onReset: () => void }) {
  const end = tenth(seconds);
  return (
    <Section title="Thời gian trên hình">
      <Slider label="Xuất hiện" min={0} max={end} step={0.1} value={from} show={`${from.toFixed(1)}s`} disabled={disabled} onChange={(v) => onChange(tenth(Math.min(v, to - 0.3)), to)} />
      <Slider label="Biến mất" min={0} max={end} step={0.1} value={Math.min(to, end)} show={to >= end ? 'Hết cảnh' : `${to.toFixed(1)}s`} disabled={disabled} onChange={(v) => onChange(from, tenth(Math.max(v, from + 0.3)))} />
      <button type="button" className="btn sm ghost" disabled={disabled} onClick={onReset}>
        ↺ Suốt cảnh
      </button>
    </Section>
  );
}

function TimedWhen({ p, name, seconds, usual = 0 }: { p: TabProps; name: TimedKey; seconds: number; usual?: number }) {
  const at = tuneOf(p.draft.value!.props)[name];
  const set = (from: number, to: number) => p.draft.setTune({ [name]: { from, ...(to < seconds - 0.05 ? { to } : {}) } }, `time:${name}`);
  return <When from={at?.from ?? usual} to={at?.to ?? seconds} seconds={seconds} disabled={p.readOnly} onChange={set} onReset={() => p.draft.setTune({ [name]: undefined })} />;
}

/** Size and offset of the hero, companion or item slot. */
function PlaceSection({ p, layer }: { p: TabProps; layer: TuneLayer }) {
  const tune = tuneOf(p.draft.value!.props);
  const at: Placement = tune[layer] ?? { dx: 0, dy: 0, scale: 1 };
  const set = (change: Partial<Placement>, tag: string) => p.draft.setTune({ [layer]: { ...at, ...change } }, `${tag}:${layer}`);
  return (
    <Section title="Vị trí và kích cỡ" hint="Cũng kéo thẳng trên khung hình được.">
      <Slider label="Cỡ" min={0.4} max={1.8} step={0.05} value={at.scale} show={pct(at.scale)} disabled={p.readOnly} onChange={(scale) => set({ scale }, 'size')} />
      <Slider label="Ngang" min={-0.5} max={0.5} step={0.01} value={at.dx} show={pct(at.dx)} disabled={p.readOnly} onChange={(dx) => set({ dx }, 'dx')} />
      <Slider label="Dọc" min={-0.4} max={0.4} step={0.01} value={-at.dy} show={pct(-at.dy)} disabled={p.readOnly} onChange={(up) => set({ dy: -up }, 'dy')} />
      <button type="button" className="btn sm ghost" disabled={p.readOnly || !tune[layer]} onClick={() => p.draft.setTune({ [layer]: undefined })}>
        ↺ Về chuẩn
      </button>
    </Section>
  );
}

function ExtraPanel({ p, index, people, things, seconds, onSelect }: Pick<Props, 'p' | 'people' | 'things' | 'seconds' | 'onSelect'> & { index: number }) {
  const extras = tuneOf(p.draft.value!.props).extras ?? [];
  const x = extras[index];
  if (!x) return null;
  const off = p.readOnly;
  const patch = (change: Partial<Extra>, tag: string) => p.draft.setExtras((list) => list.map((e, i) => (i === index ? { ...e, ...change } : e)), `${tag}:${index}`);
  const toggle = (label: string, key: 'flip' | 'front' | 'glow') => (
    <label className="row" style={{ gap: 8 }}>
      <input type="checkbox" checked={x[key]} disabled={off} onChange={(e) => patch({ [key]: e.target.checked }, key)} />
      {label}
    </label>
  );
  const person = x.kind === 'person';
  return (
    <>
      <Section title={person ? 'Ai' : 'Vật gì'}>
        <CastPicker label={person ? 'Ai' : 'Vật gì'} ids={person ? people : things} cast={p.view.cast} value={x.id} disabled={off} onChange={(id) => patch({ id }, 'id')} />
      </Section>
      {person ? (
        <>
          <Section title="Hành động">
            <Chips label="Hành động" options={options(EXTRA_ACTIONS, ACTION_NAME)} value={x.action} disabled={off} onChange={(v) => patch({ action: v as Extra['action'] }, 'action')} />
          </Section>
          <Section title="Biểu cảm">
            <Chips label="Biểu cảm" options={options(EXTRA_EMOTIONS, EMOTION_NAME)} value={x.emotion} disabled={off} onChange={(v) => patch({ emotion: v as Extra['emotion'] }, 'emotion')} />
          </Section>
        </>
      ) : (
        <Section title="Chuyển động">
          <Chips label="Chuyển động" options={options(ITEM_MOTIONS, MOTION_NAME)} value={x.motion} disabled={off} onChange={(v) => patch({ motion: v as Extra['motion'] }, 'motion')} />
          {toggle('Toả sáng', 'glow')}
        </Section>
      )}
      <Section title="Cách xuất hiện">
        <Chips label="Cách xuất hiện" options={options(EXTRA_ENTERS, ENTER_NAME)} value={x.enter} disabled={off} onChange={(v) => (patch({ enter: v as Extra['enter'] }, 'enter'))} />
      </Section>
      <Section title="Vị trí và kích cỡ" hint="Cũng kéo thẳng trên khung hình được.">
        <Slider label="Ngang" min={0} max={1} step={0.01} value={x.x} show={pct(x.x)} disabled={off} onChange={(v) => patch({ x: v }, 'x')} />
        <Slider label="Cao" min={-0.2} max={0.8} step={0.01} value={x.y} show={pct(x.y)} disabled={off} onChange={(v) => patch({ y: v }, 'y')} />
        <Slider label="Cỡ" min={0.4} max={1.8} step={0.05} value={x.scale} show={pct(x.scale)} disabled={off} onChange={(scale) => patch({ scale }, 'size')} />
        {toggle('Quay mặt ngược lại', 'flip')}
        {person && toggle('Đứng trước vai chính', 'front')}
      </Section>
      <When from={x.time?.from ?? 0} to={x.time?.to ?? seconds} seconds={seconds} disabled={off} onChange={(from, to) => patch({ time: { from, ...(to < seconds - 0.05 ? { to } : {}) } }, 'time')} onReset={() => patch({ time: undefined }, 'time')} />
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className="btn sm" disabled={off || extras.length >= 8} onClick={() => (p.draft.setExtras((list) => [...list, { ...x, x: Math.min(1, x.x + 0.12) }], ''), onSelect(`x:${extras.length}`))}>
          Nhân đôi
        </button>
        <button type="button" className="btn sm danger" disabled={off} onClick={() => (onSelect(null), p.draft.setExtras((list) => list.filter((_, i) => i !== index), ''))}>
          Bỏ khỏi cảnh
        </button>
      </div>
    </>
  );
}

function Body({ p, layer, people, things, seconds, voiceUrl, writing, onWrite, onReplay, onSelect }: Props) {
  const s = p.draft.value!;
  const tune = tuneOf(s.props);
  const off = p.readOnly;
  const poses = Object.keys(p.view.sprites).filter((k) => k.startsWith('pose:')).map((k) => k.slice(5));
  const pick = (key: 'lead' | 'companion' | 'item', title: string, ids: string[], none: string) => (
    <Section title={title}>
      <CastPicker label={title} ids={ids} cast={p.view.cast} noneLabel={none} value={String(s.props[key] ?? '')} disabled={off} onChange={(v) => p.draft.setProp(key, v)} />
    </Section>
  );
  const select = (name: string) => <ChoiceSection p={p} name={name} />;
  const hasEffectChoice = p.block.fields.some((f) => f.key === 'fx');

  if (layer.startsWith('x:')) return <ExtraPanel p={p} index={Number(layer.slice(2))} people={people} things={things} seconds={seconds} onSelect={onSelect} />;
  switch (layer) {
    case 'picture':
      return <PictureTab p={p} writing={writing} onWrite={onWrite} />;
    case 'hero':
      return (
        <>
          {pick('lead', 'Người đứng vai chính', people, 'Nhân vật chính')}
          {select('action')}
          {select('emotion')}
          <ChoiceSection p={p} name="side" title="Đứng ở" />
          {!s.props.lead && poses.length > 0 && (
            <Section title="Tư thế riêng">
              <Chips label="Tư thế riêng" options={[{ value: '', label: 'Theo hành động' }, ...poses.map((x) => ({ value: x, label: x }))]} value={String(s.props.pose ?? '')} disabled={off} onChange={(v) => p.draft.setProp('pose', v)} />
            </Section>
          )}
          <PlaceSection p={p} layer="hero" />
          <TimedWhen p={p} name="heroTime" seconds={seconds} />
        </>
      );
    case 'companion':
      return (
        <>
          {pick('companion', 'Ai', people, 'Không có')}
          {select('companionAction')}
          {select('companionEmotion')}
          <PlaceSection p={p} layer="companion" />
          <TimedWhen p={p} name="companionTime" seconds={seconds} />
        </>
      );
    case 'item':
      return (
        <>
          {pick('item', 'Vật gì', things, 'Không có')}
          <PlaceSection p={p} layer="item" />
          <TimedWhen p={p} name="itemTime" seconds={seconds} />
        </>
      );
    case 'camera':
      return (
        <>
          {select('motion')}
          {select('rhythm')}
        </>
      );
    case 'effect':
      return (
        <>
          {hasEffectChoice ? select('fx') : <ChoiceSection p={p} name="mood" title="Thời tiết và ánh sáng" />}
          <TimedWhen p={p} name="effectTime" seconds={seconds} />
        </>
      );
    case 'transition':
      return (
        <>
          {select('transition')}
          <button type="button" className="btn sm" onClick={onReplay}>
            ▶ Xem lại từ đầu
          </button>
        </>
      );
    case 'caption':
      return (
        <>
          <TextTab p={p} />
          <TimedWhen p={p} name="captionTime" seconds={seconds} usual={0.4} />
        </>
      );
    case 'voice':
      return (
        <>
          <VoiceSections p={p} voiceUrl={voiceUrl} />
          <Section title="Giờ bắt đầu">
            <Slider label="Trễ thêm" min={0} max={MAX_VOICE_DELAY_SEC} step={0.1} value={tune.voiceDelay ?? 0} show={`${(tune.voiceDelay ?? 0).toFixed(1)}s`} disabled={off} onChange={(v) => p.draft.setTune({ voiceDelay: v }, 'time:voice')} />
          </Section>
        </>
      );
    case 'sfx':
      return <SfxSection p={p} />;
    case 'hold':
      return (
        <Section title="Nghỉ cuối cảnh">
          <Slider label="Độ dài" min={0} max={MAX_HOLD_SEC} step={0.5} value={tune.holdSec ?? 0} show={`${tune.holdSec ?? 0}s`} disabled={off} onChange={(v) => p.draft.setTune({ holdSec: v })} />
        </Section>
      );
    default:
      return null;
  }
}

export function Inspector(props: Props) {
  const { p, layer, onSelect } = props;
  const extra = layer.startsWith('x:') ? tuneOf(p.draft.value!.props).extras?.[Number(layer.slice(2))] : undefined;
  return (
    <>
      <div className="dtabs inspect">
        <b>{extra ? `${extra.kind === 'item' ? 'Vật phẩm' : 'Người'}: ${extra.id}` : NAME[layer]}</b>
        <button type="button" className="btn sm ghost" onClick={() => onSelect(null)}>
          Tất cả cài đặt
        </button>
      </div>
      <div className="dpanel">
        <Body {...props} />
      </div>
    </>
  );
}
