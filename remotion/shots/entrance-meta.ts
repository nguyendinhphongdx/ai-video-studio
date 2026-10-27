// The ways a scene can open. Pure data (no React): the block definitions and the editor read it; the drawing is in
// transitions.tsx, keyed by the same ids.
export const ENTRANCE_META = [
  { id: 'cut', name: 'Cắt thẳng, hiện ngay' },
  { id: 'fade', name: 'Mờ dần vào' },
  { id: 'whip', name: 'Vụt ngang, mờ rồi nét' },
  { id: 'wipe', name: 'Quét từ trái sang' },
  { id: 'flash', name: 'Loé sáng' },
  { id: 'iris', name: 'Mống mắt mở ra' },
  { id: 'push-up', name: 'Tấm màu đẩy lên' },
  { id: 'barn-door', name: 'Cửa đôi mở ra' },
  { id: 'blinds', name: 'Rèm lá lật' },
  { id: 'glitch', name: 'Nhiễu xé' },
  { id: 'ink', name: 'Mực loang' },
  { id: 'light-leak', name: 'Hắt sáng ấm' },
  { id: 'flip', name: 'Lật thẻ' },
  { id: 'mosaic', name: 'Ô vuông tan' },
  { id: 'checker', name: 'Bàn cờ' },
  { id: 'radial-wipe', name: 'Quét tròn' },
  { id: 'diagonal-wipe', name: 'Quét chéo' },
  { id: 'zoom-through', name: 'Xuyên zoom' },
] as const;

export type EntranceId = (typeof ENTRANCE_META)[number]['id'];
