// The light and graphic overlays a picture scene can carry. Pure data (no React): the block definition and the editor read
// it; the drawing is in fx.tsx, keyed by the same ids.
export const FX_META = [
  { id: 'none', name: 'Không có', hint: 'Cảnh sạch, để ảnh tự nói.' },
  { id: 'sheen', name: 'Vệt sáng quét qua', hint: 'Nhấn một vật hoặc khoảnh khắc sang trọng.' },
  { id: 'spotlight', name: 'Đèn rọi quét ngang', hint: 'Kịch tính, điều tra, hé lộ từng phần.' },
  { id: 'scan', name: 'Tia quét dọc màn hình', hint: 'Công nghệ, phân tích, giám sát.' },
  { id: 'reticle', name: 'Khung ngắm khoá mục tiêu', hint: 'Xác định, phát hiện, "đây chính là nó".' },
  { id: 'light-leak', name: 'Hắt sáng ấm', hint: 'Hoài niệm, ấm áp, chuyển cảnh mềm.' },
  { id: 'ripple', name: 'Sóng lan từ tâm', hint: 'Tác động, âm thanh, lan toả.' },
  { id: 'burst', name: 'Tia nổ tập trung', hint: 'Cú sốc, bước ngoặt (dùng ít).' },
  { id: 'aurora', name: 'Quầng màu trôi', hint: 'Mơ màng, bí ẩn, nền cảm xúc.' },
  { id: 'glow-orbs', name: 'Quả cầu sáng nối đường bay', hint: 'Kết nối, mạng lưới, di chuyển giữa các điểm.' },
] as const;

export type FxId = (typeof FX_META)[number]['id'];
export const FX_IDS = FX_META.map((m) => m.id) as [FxId, ...FxId[]];
