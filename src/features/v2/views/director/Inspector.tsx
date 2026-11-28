'use client';

// The properties of the one layer that is selected: only the knobs that kind of layer has.
import { ANIMS, ARRIVE_EFFECTS, MAX_MOVES, type Anim, type Move, EXTRA_ACTIONS, EXTRA_EMOTIONS, EXTRA_ENTERS, ITEM_MOTIONS, MAX_HOLD_SEC, MAX_VOICE_DELAY_SEC, tuneOf, type Extra, type Placement, type TimedKey, type TuneLayer } from '@/core/domain/tune';

import { CastPicker, Chips, Section, Slider } from './controls';
import { ACTION_NAME, ChoiceSection, EMOTION_NAME, PictureTab, SfxSection, TextTab, VoiceSections, type TabProps } from './Tabs';
import { restingSpots, type Spot } from './Stage';
import type { LayerId } from './Timeline';

const ENTER_NAME = { fade: 'Hiện dần', left: 'Đi vào từ trái', right: 'Đi vào từ phải', pop: 'Bật ra' } as const;
const MOTION_NAME = { float: 'Lơ lửng', still: 'Đứng yên', spin: 'Xoay tròn' } as const;
const ANIM_NAME = { bounce: 'Nhún', jump: 'Nhảy', sway: 'Lắc lư', shake: 'Run rẩy', nod: 'Cúi gật', pulse: 'Phập phồng', float: 'Bay lơ lửng', spin: 'Xoay tròn', pace: 'Đi qua lại' } as const;
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

/** A looping movement; picking one replays the scene so it can be seen at once. */
function Motion({ value, total, disabled, onChange, onReplay }: { value: Anim | undefined; total: number; disabled: boolean; onChange: (next: Anim | undefined, tag: string) => void; onReplay: () => void }) {
  return (
    <Section title="Hoạt ảnh" hint="Cử động lặp lại, cộng thêm vào hành động đã chọn. Không tốn tiền.">
      <Chips label="Hoạt ảnh" options={[{ value: '', label: 'Không' }, ...options(ANIMS, ANIM_NAME)]} value={value?.type ?? ''} disabled={disabled} onChange={(v) => (onChange(v ? { ...(value ?? { speed: 1, power: 1 }), type: v as Anim['type'] } : undefined, 'anim'), v && onReplay())} />
      {value && (
        <>
          <Slider label="Nhịp" min={0.3} max={3} step={0.1} value={value.speed} show={`${value.speed}×`} disabled={disabled} onChange={(speed) => onChange({ ...value, speed }, 'anim-speed')} />
          {value.type !== 'spin' && <Slider label="Độ mạnh" min={0.3} max={2} step={0.1} value={value.power} show={`${value.power}×`} disabled={disabled} onChange={(power) => onChange({ ...value, power }, 'anim-power')} />}
          <Slider label="Bắt đầu sau" min={0} max={tenth(total)} step={0.1} value={value.start ?? 0} show={value.start ? `${value.start.toFixed(1)}s sau khi hiện` : 'Ngay khi hiện'} disabled={disabled} onChange={(v) => onChange({ ...value, start: v ? tenth(v) : undefined }, 'anim-start')} />
          <Slider label="Kéo dài" min={0.5} max={tenth(total)} step={0.1} value={value.lasts ?? tenth(total)} show={value.lasts ? `${value.lasts.toFixed(1)}s` : 'Đến hết'} disabled={disabled} onChange={(v) => onChange({ ...value, lasts: v >= tenth(total) - 0.05 ? undefined : tenth(v) }, 'anim-lasts')} />
          <button type="button" className="btn sm ghost" disabled={disabled} onClick={onReplay}>
            ▶ Xem lại
          </button>
        </>
      )}
    </Section>
  );
}

const EFFECT_NAME = { sparkle: 'Lấp lánh', flash: 'Loé sáng', impact: 'Va đập' } as const;

/** What happens to this figure as the scene goes on: step by step, a new face or gesture, a walk, an effect. */
function Moves({ value, spots, who, nameOf, person, total, disabled, onChange, onReplay }: { value: Move[] | undefined; spots: Spot[]; who: string; nameOf: (who: string) => string; person: boolean; total: number; disabled: boolean; onChange: (next: Move[] | undefined, tag: string) => void; onReplay: () => void }) {
  const legs = value ?? [];
  const patch = (index: number, change: Partial<Move>, tag: string) => onChange(legs.map((m, i) => (i === index ? { ...m, ...change } : m)), `move-${tag}-${index}`);
  const me = spots.find((x) => x.who === who);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const add = () => {
    const last = legs.at(-1);
    const at = tenth(Math.min(total - 0.5, last ? last.at + last.over + 0.5 : 1));
    onChange([...legs, { at, over: 1 }], 'move-add');
  };
  return (
    <Section title="Diễn biến trong cảnh" hint="Mỗi bước bắt đầu ở một giây. Để “giữ nguyên” cho thứ không đổi. Vị trí tính từ chỗ đứng gốc.">
      {legs.map((m, i) => (
        <div key={i} className="col extra">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>Bước {i + 1}</b>
            <button type="button" className="btn sm ghost danger" disabled={disabled} aria-label={`Bỏ bước ${i + 1}`} onClick={() => onChange(legs.length > 1 ? legs.filter((_, k) => k !== i) : undefined, 'move-remove')}>
              ×
            </button>
          </div>
          <Slider label="Bắt đầu" min={0} max={tenth(total)} step={0.1} value={m.at} show={`giây ${m.at.toFixed(1)}`} disabled={disabled} onChange={(at) => patch(i, { at: tenth(at) }, 'at')} />
          {person && (
            <>
              <select className="select" aria-label="Biểu cảm" disabled={disabled} value={m.emotion ?? ''} onChange={(e) => patch(i, { emotion: (e.target.value || undefined) as Move['emotion'] }, 'emotion')}>
                <option value="">Biểu cảm: giữ nguyên</option>
                {EXTRA_EMOTIONS.map((a) => (
                  <option key={a} value={a}>
                    Biểu cảm: {EMOTION_NAME[a].toLowerCase()}
                  </option>
                ))}
              </select>
              <select className="select" aria-label="Hành động" disabled={disabled} value={m.action ?? ''} onChange={(e) => patch(i, { action: (e.target.value || undefined) as Move['action'] }, 'action')}>
                <option value="">Hành động: giữ nguyên</option>
                {EXTRA_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    Hành động: {ACTION_NAME[a].toLowerCase()}
                  </option>
                ))}
              </select>
            </>
          )}
          <Slider label="Đi trong" min={0.2} max={8} step={0.1} value={m.over} show={`${m.over.toFixed(1)}s`} disabled={disabled} onChange={(over) => patch(i, { over: tenth(over) }, 'over')} />
          {me && (
            <div className="chips">
              <button type="button" className="pick" disabled={disabled} onClick={() => patch(i, { x: round(0.5 - me.x), y: round(0.5 - me.y) }, 'to')}>
                Ra giữa
              </button>
              <button type="button" className="pick" disabled={disabled} onClick={() => patch(i, { x: 0, y: 0, scale: 1 }, 'to')}>
                Về chỗ cũ
              </button>
              {spots
                .filter((x) => x.who !== who)
                .map((x) => (
                  <button key={x.who} type="button" className="pick" disabled={disabled} onClick={() => patch(i, { x: round(x.x - me.x), y: round(x.y - me.y) }, 'to')}>
                    Đến {nameOf(x.who)}
                  </button>
                ))}
            </div>
          )}
          <Slider label="Đến ngang" min={-1} max={1} step={0.01} value={m.x ?? 0} show={m.x === undefined ? 'Giữ' : pct(m.x)} disabled={disabled} onChange={(x) => patch(i, { x }, 'x')} />
          <Slider label="Đến cao" min={-0.4} max={0.6} step={0.01} value={m.y ?? 0} show={m.y === undefined ? 'Giữ' : pct(m.y)} disabled={disabled} onChange={(y) => patch(i, { y }, 'y')} />
          <Slider label="Cỡ khi tới" min={0.4} max={2.2} step={0.05} value={m.scale ?? 1} show={m.scale === undefined ? 'Giữ' : pct(m.scale)} disabled={disabled} onChange={(scale) => patch(i, { scale }, 'scale')} />
          <Slider label="Đường cong" min={-0.4} max={0.4} step={0.01} value={m.arc ?? 0} show={m.arc ? pct(m.arc) : 'Thẳng'} disabled={disabled} onChange={(arc) => patch(i, { arc: arc || undefined }, 'arc')} />
          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={Boolean(m.spin)} disabled={disabled} onChange={(e) => patch(i, { spin: e.target.checked || undefined }, 'spin')} />
            Xoay tít khi bay
          </label>
          <select className="select" aria-label="Cử động khi tới nơi" disabled={disabled} value={m.then ?? ''} onChange={(e) => patch(i, { then: (e.target.value || undefined) as Move['then'] }, 'then')}>
            <option value="">Tới nơi: đứng yên</option>
            {ANIMS.map((a) => (
              <option key={a} value={a}>
                Tới nơi: {ANIM_NAME[a].toLowerCase()}
              </option>
            ))}
          </select>
          <select className="select" aria-label="Hiệu ứng khi tới nơi" disabled={disabled} value={m.effect ?? ''} onChange={(e) => patch(i, { effect: (e.target.value || undefined) as Move['effect'] }, 'effect')}>
            <option value="">Không hiệu ứng</option>
            {ARRIVE_EFFECTS.map((a) => (
              <option key={a} value={a}>
                {EFFECT_NAME[a]}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className="btn sm" disabled={disabled || legs.length >= MAX_MOVES} onClick={add}>
          + Thêm bước
        </button>
        {legs.length > 0 && (
          <button type="button" className="btn sm ghost" disabled={disabled} onClick={onReplay}>
            ▶ Xem lại
          </button>
        )}
      </div>
    </Section>
  );
}

/** What a step needs to know about the stage around its figure. */
function around(p: TabProps) {
  const scene = p.draft.value!;
  const extras = tuneOf(scene.props).extras ?? [];
  const nameOf = (who: string) => (who.startsWith('x:') ? (extras[Number(who.slice(2))]?.id ?? who) : NAME[who]!.toLowerCase());
  return { spots: restingSpots(scene), nameOf };
}

/** Size and offset of the hero, companion or item slot. */
function PlaceSection({ p, layer, total, onReplay }: { p: TabProps; layer: TuneLayer; total: number; onReplay: () => void }) {
  const tune = tuneOf(p.draft.value!.props);
  const at: Placement = tune[layer] ?? { dx: 0, dy: 0, scale: 1 };
  const set = (change: Partial<Placement>, tag: string) => p.draft.setTune({ [layer]: { ...at, ...change } }, `${tag}:${layer}`);
  return (
    <>
    <Moves {...around(p)} who={layer} person={layer !== 'item'} value={at.moves} total={total} disabled={p.readOnly} onReplay={onReplay} onChange={(moves, tag) => set({ moves }, tag)} />
    <Motion total={total} value={at.anim} disabled={p.readOnly} onReplay={onReplay} onChange={(anim, tag) => set({ anim }, tag)} />
    <Section title="Vị trí và kích cỡ" hint="Cũng kéo thẳng trên khung hình được.">
      <Slider label="Cỡ" min={0.4} max={1.8} step={0.05} value={at.scale} show={pct(at.scale)} disabled={p.readOnly} onChange={(scale) => set({ scale }, 'size')} />
      <Slider label="Ngang" min={-0.5} max={0.5} step={0.01} value={at.dx} show={pct(at.dx)} disabled={p.readOnly} onChange={(dx) => set({ dx }, 'dx')} />
      <Slider label="Dọc" min={-0.4} max={0.4} step={0.01} value={-at.dy} show={pct(-at.dy)} disabled={p.readOnly} onChange={(up) => set({ dy: -up }, 'dy')} />
      <button type="button" className="btn sm ghost" disabled={p.readOnly || !tune[layer]} onClick={() => p.draft.setTune({ [layer]: undefined })}>
        ↺ Về chuẩn
      </button>
    </Section>
    </>
  );
}

function ExtraPanel({ p, index, people, things, seconds, onSelect, onReplay }: Pick<Props, 'p' | 'people' | 'things' | 'seconds' | 'onSelect' | 'onReplay'> & { index: number }) {
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
      <Moves {...around(p)} who={`x:${index}`} person={person} value={x.moves} total={seconds} disabled={off} onReplay={onReplay} onChange={(moves, tag) => patch({ moves }, tag)} />
      <Motion total={seconds} value={x.anim} disabled={off} onReplay={onReplay} onChange={(anim, tag) => patch({ anim }, tag)} />
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

  if (layer.startsWith('x:')) return <ExtraPanel p={p} index={Number(layer.slice(2))} people={people} things={things} seconds={seconds} onSelect={onSelect} onReplay={onReplay} />;
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
          <PlaceSection p={p} total={seconds} layer="hero" onReplay={onReplay} />
          <TimedWhen p={p} name="heroTime" seconds={seconds} />
        </>
      );
    case 'companion':
      return (
        <>
          {pick('companion', 'Ai', people, 'Không có')}
          {select('companionAction')}
          {select('companionEmotion')}
          <PlaceSection p={p} total={seconds} layer="companion" onReplay={onReplay} />
          <TimedWhen p={p} name="companionTime" seconds={seconds} />
        </>
      );
    case 'item':
      return (
        <>
          {pick('item', 'Vật gì', things, 'Không có')}
          <PlaceSection p={p} total={seconds} layer="item" onReplay={onReplay} />
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
