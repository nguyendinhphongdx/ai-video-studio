// A channel's own intro or outro, as data: layers (text, shapes, logo, avatar, AI art, subscribe button) with
// positions in percent, colours and animations. The AI designs it per channel and edits it from feedback; one
// generic Remotion component draws any design. All fields are required so every AI provider can fill the schema.
import { z } from 'zod';

const Hex = z.string().describe('Màu #RRGGBB');
const Frame = z.object({
  x: z.number().describe('Tâm ngang, 0-100 (% chiều rộng khung hình)'),
  y: z.number().describe('Tâm dọc, 0-100 (% chiều cao khung hình)'),
  w: z.number().describe('Rộng, 1-100 (% chiều rộng)'),
  h: z.number().describe('Cao, 1-100 (% chiều cao)'),
});
const Anim = z.enum(['none', 'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'pop', 'wipe', 'type', 'float', 'pulse']);

const placement = {
  anim: Anim.describe('Hiệu ứng xuất hiện (type chỉ dành cho chữ; float/pulse chạy liên tục sau khi hiện)'),
  delay: z.number().describe('Trễ trước khi hiện, 0-3 giây; lớp sau nên trễ hơn lớp trước để xuất hiện lần lượt'),
  land: Frame.describe('Vị trí khi video ngang 16:9'),
  port: Frame.describe('Vị trí khi video dọc 9:16 (bố trí lại, không chỉ co nhỏ)'),
};

export const DesignLayerSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    ...placement,
    text: z.string().describe('Nội dung. Chỗ giữ: {channel} tên kênh, {title} tên video (intro), {outro} câu chào cuối, {subscribe} chữ nút đăng ký. Tối đa 90 ký tự'),
    size: z.number().describe('Cỡ chữ, 2-40 (% cạnh ngắn của khung hình; 8 là tiêu đề lớn, 3 là chữ nhỏ)'),
    weight: z.enum(['400', '600', '800']),
    color: Hex,
    font: z.enum(['brand', 'mono', 'serif', 'hand', 'impact']).describe('brand = font của kênh; mono = máy chữ; serif = có chân; hand = viết tay; impact = dày, tiêu đề'),
    upper: z.boolean().describe('In hoa'),
    spacing: z.number().describe('Giãn chữ, 0-20 (% cỡ chữ)'),
    align: z.enum(['left', 'center', 'right']),
  }),
  z.object({
    kind: z.literal('shape'),
    ...placement,
    shape: z.enum(['rect', 'ellipse', 'line', 'ring']),
    fill: Hex,
    opacity: z.number().describe('0-1'),
    radius: z.number().describe('Bo góc hình chữ nhật, 0-50 (%)'),
    rotate: z.number().describe('Xoay, -45 đến 45 độ'),
  }),
  z.object({ kind: z.literal('logo'), ...placement, circle: z.boolean().describe('Cắt tròn') }),
  z.object({ kind: z.literal('avatar'), ...placement, circle: z.boolean(), ring: Hex.describe('Màu viền, "" nếu không viền') }),
  z.object({ kind: z.literal('art'), ...placement, opacity: z.number().describe('0-1; ảnh nền AI của kênh (chỉ hiện khi kênh đã tạo ảnh)') }),
  z.object({ kind: z.literal('subscribe'), ...placement, fill: Hex, color: Hex, radius: z.number().describe('Bo góc, 0-50 (%); 50 là viên thuốc') }),
]);
export type DesignLayer = z.infer<typeof DesignLayerSchema>;

export const SceneDesignSchema = z.object({
  background: z.object({
    mode: z.enum(['solid', 'linear', 'radial']),
    colors: z.array(Hex).describe('1-3 màu; solid dùng màu đầu'),
    angle: z.number().describe('Góc của linear, 0-360'),
    texture: z.enum(['none', 'grid', 'dots', 'lines', 'paper', 'noise']),
    vignette: z.boolean().describe('Tối dần ở góc'),
  }),
  layers: z.array(DesignLayerSchema).describe('Từ dưới lên trên, 3-12 lớp'),
  artPrompt: z.string().describe('Tiếng Anh, mô tả ảnh nền AI hợp với thiết kế này (không chữ trong ảnh); "" nếu thiết kế không cần ảnh nền'),
  seconds: z.number().describe('Thời lượng cảnh, 3-7 giây'),
});
export type SceneDesign = z.infer<typeof SceneDesignSchema>;

export const DESIGN_TOKENS = ['{channel}', '{title}', '{outro}', '{subscribe}'] as const;
export const MAX_DESIGN_LAYERS = 14;

const clamp = (n: number, lo: number, hi: number, fallback = lo) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback);
const hex = (c: string, fallback: string) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback);
const frame = (f: z.infer<typeof Frame>): z.infer<typeof Frame> => ({ x: clamp(f.x, 0, 100, 50), y: clamp(f.y, 0, 100, 50), w: clamp(f.w, 1, 100, 50), h: clamp(f.h, 1, 100, 20) });

/** Clamp whatever the AI produced into drawable values; falls back to the channel palette for bad colours. */
export function normalizeDesign(design: SceneDesign, palette: string[]): SceneDesign {
  const main = hex(palette[0] ?? '', '#4F46E5');
  const accent = hex(palette[1] ?? '', '#FFC53D');
  const colors = design.background.colors.map((c) => hex(c, main)).slice(0, 3);
  const layers = design.layers.slice(0, MAX_DESIGN_LAYERS).map((l): DesignLayer => {
    const base = { anim: l.anim, delay: clamp(l.delay, 0, 3, 0), land: frame(l.land), port: frame(l.port) };
    switch (l.kind) {
      case 'text':
        return { ...l, ...base, text: l.text.slice(0, 90), size: clamp(l.size, 2, 40, 6), color: hex(l.color, '#FFFFFF'), spacing: clamp(l.spacing, 0, 20, 0) };
      case 'shape':
        return { ...l, ...base, fill: hex(l.fill, accent), opacity: clamp(l.opacity, 0, 1, 1), radius: clamp(l.radius, 0, 50, 0), rotate: clamp(l.rotate, -45, 45, 0) };
      case 'avatar':
        return { ...l, ...base, ring: l.ring ? hex(l.ring, '#FFFFFF') : '' };
      case 'art':
        return { ...l, ...base, opacity: clamp(l.opacity, 0, 1, 1) };
      case 'subscribe':
        return { ...l, ...base, fill: hex(l.fill, accent), color: hex(l.color, '#111111'), radius: clamp(l.radius, 0, 50, 50) };
      default:
        return { ...l, ...base };
    }
  });
  return {
    background: { mode: design.background.mode, colors: colors.length ? colors : [main], angle: clamp(design.background.angle, 0, 360, 135), texture: design.background.texture, vignette: design.background.vignette },
    layers,
    artPrompt: design.artPrompt.trim().slice(0, 400),
    seconds: clamp(design.seconds, 3, 7, 4),
  };
}

export function fillDesignText(text: string, vars: { channel: string; title: string; outro: string; subscribe: string }): string {
  return text.replace(/\{(channel|title|outro|subscribe)\}/g, (_, k: keyof typeof vars) => vars[k]);
}

/** Plain fallback so a channel without its own design still renders. The channel is expected to get its own from the AI. */
export function fallbackDesign(kind: 'intro' | 'outro', palette: string[]): SceneDesign {
  const main = hex(palette[0] ?? '', '#4F46E5');
  const frame0 = { x: 50, y: 50, w: 80, h: 20 };
  const text = (t: string, size: number, y: number, weight: '400' | '600' | '800', delay: number): DesignLayer => ({
    kind: 'text', anim: 'fade', delay, land: { ...frame0, y }, port: { ...frame0, y, w: 86 }, text: t, size, weight, color: '#FFFFFF', font: 'brand', upper: false, spacing: 0, align: 'center',
  });
  const layers: DesignLayer[] =
    kind === 'intro'
      ? [text('{channel}', 3.4, 38, '600', 0), text('{title}', 8, 52, '800', 0.3)]
      : [text('{outro}', 7, 42, '800', 0), { kind: 'subscribe', anim: 'pop', delay: 0.4, land: { x: 50, y: 64, w: 30, h: 9 }, port: { x: 50, y: 62, w: 60, h: 7 }, fill: '#FFFFFF', color: main, radius: 50 }];
  return { background: { mode: 'linear', colors: [main, main], angle: 135, texture: 'none', vignette: false }, layers, artPrompt: '', seconds: kind === 'intro' ? 4 : 5 };
}

/**
 * How alike two designs look (0-1): background plus layers compared one by one (same kind, same place within 8%).
 * Lets the assistant notice that a "redesign" came out as the same picture.
 */
export function designSimilarity(a: SceneDesign, b: SceneDesign): number {
  const bg = (x: SceneDesign) => `${x.background.mode}|${x.background.colors.join(',')}|${x.background.texture}`;
  const near = (p: { x: number; y: number; w: number; h: number }, q: { x: number; y: number; w: number; h: number }) =>
    Math.abs(p.x - q.x) <= 8 && Math.abs(p.y - q.y) <= 8 && Math.abs(p.w - q.w) <= 12 && Math.abs(p.h - q.h) <= 12;
  const n = Math.max(a.layers.length, b.layers.length);
  if (!n) return 1;
  const same = a.layers.filter((l, i) => b.layers[i]?.kind === l.kind && near(l.land, b.layers[i]!.land)).length;
  return 0.25 * (bg(a) === bg(b) ? 1 : 0) + 0.75 * (same / n);
}
