import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';
import { ENTRANCE_META, type EntranceId } from '@video/shots/entrance-meta';
import { CUT_META, type CutId } from '@video/shots/cut-meta';
import { FX_META, type FxId } from '@video/shots/fx-meta';

export const HexColor = z.string().describe('Màu chủ đạo dạng #RRGGBB, tươi sáng, khác màu các cảnh bên cạnh');
export const Count = z.number().describe('Số lần lặp emoji, 1-10. Với video đếm số = đúng con số đang dạy; còn lại thường là 1');
export const clampCount = (n: number) => Math.min(10, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));
export const cleanColor = (c: string, fallback = '#4FC3F7') => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback);

/** Compile-time check that a block's schema and its Remotion component agree. */
export type Assert<T extends true> = T;
export type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const MotionEnum = z
  .enum(['auto', 'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'drift-up', 'drift-down', 'orbit-left', 'orbit-right', 'tilt-glide', 'overhead', 'crash-zoom', 'slide-parallax', 'bullet-time', 'pull-back', 'drone-dive', 'graze-slide', 'steep-slide', 'handheld-push'])
  .describe(
    'Chuyển động máy quay trên ảnh. Dùng "auto" (hệ thống tự đổi luân phiên giữa các cảnh) trừ khi cảnh cần một kiểu cụ thể: zoom-in nhấn mạnh, zoom-out hé lộ toàn cảnh, pan theo hướng di chuyển, drift lên/xuống cho cảnh cao/sâu, orbit-left/right quay vòng quanh chủ thể (cảnh vật thể, nhân vật), tilt-glide nghiêng lướt nhẹ (địa điểm, toà nhà), overhead nhìn từ trên xuống bàn rồi hạ xuống (bản đồ, tài liệu, bố trí), crash-zoom đập vào mạnh (hook, con số gây sốc, bước ngoặt; dùng tối đa 1-2 lần/video), slide-parallax trượt ngang có chiều sâu (dòng thời gian, hành trình), bullet-time quét vòng cung rộng như đóng băng thời gian (khoảnh khắc then chốt), pull-back lùi xa để chủ thể nhỏ bé và cô độc (cô đơn, quy mô), drone-dive từ trên cao lao xuống hạ cánh (mở bối cảnh), graze-slide và steep-slide lướt xiên sát bề mặt (tài liệu, bảng, toà nhà; dùng ít), handheld-push đẩy chậm với tay máy rung nhẹ (căng thẳng, phóng sự)',
  );

export const MOTION_OPTIONS = [
  { value: 'auto', label: 'Tự động (đổi luân phiên)' },
  { value: 'zoom-in', label: 'Zoom vào' },
  { value: 'zoom-out', label: 'Zoom ra' },
  { value: 'pan-left', label: 'Lướt sang trái' },
  { value: 'pan-right', label: 'Lướt sang phải' },
  { value: 'drift-up', label: 'Trượt lên' },
  { value: 'drift-down', label: 'Trượt xuống' },
  { value: 'orbit-left', label: 'Quay vòng (từ trái)' },
  { value: 'orbit-right', label: 'Quay vòng (từ phải)' },
  { value: 'tilt-glide', label: 'Nghiêng lướt' },
  { value: 'overhead', label: 'Từ trên xuống' },
  { value: 'crash-zoom', label: 'Zoom đập (nhấn mạnh)' },
  { value: 'slide-parallax', label: 'Trượt có chiều sâu' },
  { value: 'bullet-time', label: 'Quét vòng cung (đóng băng thời gian)' },
  { value: 'pull-back', label: 'Lùi xa, chủ thể cô độc' },
  { value: 'drone-dive', label: 'Từ trên cao lao xuống' },
  { value: 'graze-slide', label: 'Lướt xiên sát bề mặt' },
  { value: 'steep-slide', label: 'Trượt nghiêng gắt' },
  { value: 'handheld-push', label: 'Đẩy chậm, tay máy rung' },
];

export const DepthEnum = z.enum(['auto', 'flat', 'layered']).default('auto').describe('Chiều sâu của ảnh: "auto" (hệ thống đổi luân phiên) hoặc để trống; "layered" ảnh nổi như tấm giấy trên nền mờ có bụi bay phía trước; "flat" ảnh tràn khung');
export const DEPTH_OPTIONS = [
  { value: 'auto', label: 'Tự động (đổi luân phiên)' },
  { value: 'flat', label: 'Ảnh tràn khung' },
  { value: 'layered', label: 'Ảnh nổi nhiều lớp' },
];

// Camera framing of a picture. The sentence is added to the picture prompt, so a new shot means a new picture.
export const SHOTS = ['auto', 'wide', 'close-up', 'macro', 'top-down', 'low-angle', 'diagonal', 'left-third', 'right-third', 'split', 'scale-contrast', 'frame-in-frame', 'cluster'] as const;
export type Shot = (typeof SHOTS)[number];

export const SHOT_TEXT: Record<Shot, string> = {
  auto: '',
  wide: 'Wide establishing shot: the subject is small inside a large environment with lots of surrounding space',
  'close-up': 'Close-up: the subject fills about two thirds of the frame',
  macro: 'Extreme macro: one detail enlarged huge and cropped by the frame edges',
  'top-down': 'Top-down flat-lay view looking straight down at the paper pieces on the table',
  'low-angle': 'Low camera angle looking up so the subject towers over the viewer',
  diagonal: 'Dynamic diagonal composition: the subject and its arrow run along a tilted diagonal axis',
  'left-third': 'Subject placed in the left third of the frame, large empty space on the right',
  'right-third': 'Subject placed in the right third of the frame, large empty space on the left',
  split: 'Split composition: the frame divided into two contrasting halves by a torn paper edge',
  'scale-contrast': 'Dramatic scale contrast: one enormous object next to one tiny object',
  'frame-in-frame': 'The picture sits inside a frame within the frame (a polaroid, a window, a torn cover)',
  cluster: 'A cluster of three to five related paper pieces arranged asymmetrically',
};

export const SHOT_OPTIONS: { value: Shot; label: string }[] = [
  { value: 'auto', label: 'Không chỉ định' },
  { value: 'wide', label: 'Toàn cảnh' },
  { value: 'close-up', label: 'Cận cảnh' },
  { value: 'macro', label: 'Cực cận một chi tiết' },
  { value: 'top-down', label: 'Nhìn từ trên xuống' },
  { value: 'low-angle', label: 'Góc thấp, vật sừng sững' },
  { value: 'diagonal', label: 'Bố cục chéo' },
  { value: 'left-third', label: 'Lệch trái' },
  { value: 'right-third', label: 'Lệch phải' },
  { value: 'split', label: 'Chia đôi đối lập' },
  { value: 'scale-contrast', label: 'Tương phản kích cỡ' },
  { value: 'frame-in-frame', label: 'Khung trong khung' },
  { value: 'cluster', label: 'Chùm nhiều mảnh' },
];



export const ShotEnum = z
  .enum(SHOTS)
  .default('auto')
  .describe('Kiểu khung hình/bố cục của ảnh. LUÔN chọn một kiểu cụ thể (không để auto) và đổi liên tục: không hai cảnh liền nhau cùng shot, một shot không quá 2 lần trong cả video; xen toàn cảnh, cận cảnh, cực cận, nhìn từ trên, góc thấp, lệch trái/phải, chéo, chia đôi');

const SWEEPS = new Set(['orbit-left', 'orbit-right', 'tilt-glide', 'overhead', 'slide-parallax', 'bullet-time', 'drone-dive', 'graze-slide', 'steep-slide']);
/** The sound that goes with a camera move on the way into a picture scene. */
export function moveCue(move: string): SfxCue[] {
  if (move === 'crash-zoom') return [{ kind: 'impact', at: 0.05 }];
  if (SWEEPS.has(move)) return [{ kind: 'whoosh', at: -0.05, volume: 0.4 }];
  if (move === 'pull-back') return [{ kind: 'whoosh-soft', at: 0.0, volume: 0.3 }];
  return [];
}

export const FxEnum = z
  .enum(['auto', ...FX_META.map((m) => m.id)] as ['auto', FxId, ...FxId[]])
  .default('auto')
  .describe('Lớp ánh sáng/đồ hoạ phủ lên ảnh: "auto" (hệ thống tự xen kẽ, đa số cảnh để sạch) hoặc để trống. Chỉ chọn riêng khi cảnh cần: sheen (vệt sáng), spotlight (đèn rọi), scan (tia quét), reticle (khung ngắm), light-leak (hắt sáng ấm), ripple (sóng lan), burst (tia nổ, dùng rất ít), aurora (quầng màu), glow-orbs (quả cầu nối đường bay)');
export const FX_OPTIONS = [{ value: 'auto', label: 'Tự động (đa số để sạch)' }, ...FX_META.map((m) => ({ value: m.id, label: m.name }))];

export const RhythmEnum = z
  .enum(['auto', ...CUT_META.map((m) => m.id)] as ['auto', CutId, ...CutId[]])
  .default('auto')
  .describe('Cách cắt nhịp của ảnh: "auto" (hầu hết cảnh chạy camera một mạch) hoặc để trống. Chỉ chọn riêng khi cảnh cần dồn nhịp: jump-punch (phóng to ba nấc, câu dồn dập), flash-freeze (ba cú chớp: toàn cảnh, vật, đặc tả; hook hoặc bước ngoặt), comic-panels (chia ô chéo, ba góc của cùng chủ thể), quad (bốn ô cùng lúc, rất ít), sakuga (giật nhịp rồi vút mượt, cảnh hành động). Tối đa 2-3 cảnh mỗi video');
export const RHYTHM_OPTIONS = [{ value: 'auto', label: 'Tự động (hầu hết một mạch)' }, ...CUT_META.map((m) => ({ value: m.id, label: m.name }))];

/** Sounds that land on the cuts of a rhythm style (frame times of remotion/camera/cuts.tsx at 30 fps). */
export function cutCue(cut: string): SfxCue[] {
  if (cut === 'flash-freeze') return [0, 14, 28].map((f) => ({ kind: 'impact' as const, at: f / 30, volume: 0.28 }));
  if (cut === 'jump-punch') return [0, 18, 36].map((f) => ({ kind: 'stamp' as const, at: f / 30, volume: 0.24 }));
  if (cut === 'comic-panels') return [0, 9, 18].map((f) => ({ kind: 'pop' as const, at: f / 30, volume: 0.3 }));
  if (cut === 'quad') return [0, 4, 8, 12].map((f) => ({ kind: 'tick' as const, at: f / 30 }));
  return [];
}

export const TransitionEnum = z
  .enum(['auto', ...ENTRANCE_META.map((m) => m.id)] as ['auto', EntranceId, ...EntranceId[]])
  .default('auto')
  .describe('Cách cảnh này mở ra: "auto" (hệ thống đổi luân phiên giữa các cảnh) hoặc để trống. Chỉ chọn riêng khi cảnh cần một mở đầu đặc biệt (glitch cho công nghệ, light-leak cho hoài niệm, iris cho tiêu điểm...)');
export const TRANSITION_OPTIONS = [{ value: 'auto', label: 'Tự động (đổi luân phiên)' }, ...ENTRANCE_META.map((m) => ({ value: m.id, label: m.name }))];
