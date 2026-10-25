import { z } from 'zod';

export const HexColor = z.string().describe('Màu chủ đạo dạng #RRGGBB, tươi sáng, khác màu các cảnh bên cạnh');
export const Count = z.number().describe('Số lần lặp emoji, 1-10. Với video đếm số = đúng con số đang dạy; còn lại thường là 1');
export const Look = z.enum(['sky', 'board']).describe('sky = nền màu tươi; board = bảng trắng vẽ tay. Chọn theo phong cách các cảnh còn lại');

export const clampCount = (n: number) => Math.min(10, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));
export const cleanColor = (c: string, fallback = '#4FC3F7') => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback);

/** Compile-time check that a tool's schema and its Remotion component agree. */
export type Assert<T extends true> = T;
export type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
