import { z } from 'zod';

export const HexColor = z.string().describe('Màu chủ đạo dạng #RRGGBB, tươi sáng, khác màu các cảnh bên cạnh');
export const Count = z.number().describe('Số lần lặp emoji, 1-10. Với video đếm số = đúng con số đang dạy; còn lại thường là 1');
export const clampCount = (n: number) => Math.min(10, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));
export const cleanColor = (c: string, fallback = '#4FC3F7') => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback);

/** Compile-time check that a block's schema and its Remotion component agree. */
export type Assert<T extends true> = T;
export type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const MotionEnum = z
  .enum(['auto', 'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'drift-up', 'drift-down'])
  .describe('Chuyển động máy quay trên ảnh. Dùng "auto" (hệ thống tự đổi luân phiên giữa các cảnh) trừ khi cảnh cần một kiểu cụ thể: zoom-in nhấn mạnh, zoom-out hé lộ toàn cảnh, pan theo hướng di chuyển, drift lên/xuống cho cảnh cao/sâu');

export const MOTION_OPTIONS = [
  { value: 'auto', label: 'Tự động (đổi luân phiên)' },
  { value: 'zoom-in', label: 'Zoom vào' },
  { value: 'zoom-out', label: 'Zoom ra' },
  { value: 'pan-left', label: 'Lướt sang trái' },
  { value: 'pan-right', label: 'Lướt sang phải' },
  { value: 'drift-up', label: 'Trượt lên' },
  { value: 'drift-down', label: 'Trượt xuống' },
];
