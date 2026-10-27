// Cutting styles for a picture scene: instead of one camera move, the picture is cut up and shown several ways in
// rhythm. Pure data (no React); the drawing is in remotion/camera/cuts.tsx, keyed by the same ids.
export const CUT_META = [
  { id: 'none', name: 'Không cắt (camera một mạch)', hint: 'Mặc định.' },
  { id: 'jump-punch', name: 'Cắt nhảy phóng to ba nấc', hint: 'Dồn ép dần vào một chi tiết; câu có nhịp dồn dập.' },
  { id: 'flash-freeze', name: 'Chớp trắng, mỗi lần một khung cắt', hint: 'Khoảnh khắc "cheo" ba cú: toàn cảnh, vật, đặc tả (hook, bước ngoặt).' },
  { id: 'comic-panels', name: 'Chia ô truyện tranh chéo', hint: 'Cùng một chủ thể từ ba góc, ô cuối ăn hết màn hình.' },
  { id: 'quad', name: 'Bốn ô song song', hint: 'Nhiều mặt của một ý cùng lúc ("thông tin dồn dập"); dùng rất ít.' },
  { id: 'sakuga', name: 'Chuyển động giật nhịp rồi vút mượt', hint: 'Cảnh hành động: giật từng bước rồi bất ngờ mượt ở cao trào.' },
] as const;

export type CutId = (typeof CUT_META)[number]['id'];
export const CUT_IDS = CUT_META.map((m) => m.id) as [CutId, ...CutId[]];
