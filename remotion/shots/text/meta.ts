// What the text shots are called and when to use them. Pure data (no React) so the block definition, the editor and the
// AI can read it; the drawing lives next to it in entrances.tsx and cycles.tsx, keyed by the same ids.
export interface TextShotMeta {
  id: string;
  /** Vietnamese name for the editor. */
  name: string;
  /** When to use it. */
  hint: string;
  /** Rotates through `items` (one line each). */
  items: boolean;
  /** Drawn on light paper instead of the dark stage. */
  light: boolean;
}

export const TEXT_SHOT_META = [
  { id: 'rise', name: 'Rơi lên từng từ', hint: 'Mặc định gọn gàng cho câu chốt.', items: false, light: false },
  { id: 'blur-slide', name: 'Trượt vào, mờ rồi nét', hint: 'Tiêu đề chuyên nghiệp, không giành sân khấu.', items: false, light: false },
  { id: 'zoom-assemble', name: 'Từ khoá phóng ra rồi ghép câu', hint: 'Câu có một từ then chốt cần chiếm cả màn hình trước.', items: false, light: false },
  { id: 'outline-fill', name: 'Viền rồi tô đầy', hint: 'Nhấn từng từ nối nhau, nhịp chắc.', items: false, light: false },
  { id: 'typewriter', name: 'Gõ chữ', hint: 'Câu hỏi, lời thì thầm, cảm giác đang suy nghĩ.', items: false, light: false },
  { id: 'split-stagger', name: 'Chữ cái trồi lên từ khe', hint: 'Tiêu đề lớn, gọn và sắc.', items: false, light: false },
  { id: 'letter-drop', name: 'Chữ rơi, nảy, rồi đứng thẳng', hint: 'Vui, có trọng lượng; hợp kênh thiếu nhi, hài hước.', items: false, light: false },
  { id: 'letter-drift', name: 'Chữ trôi từ nơi xa rồi gom lại', hint: 'Mở chương, bí ẩn, mơ màng.', items: false, light: false },
  { id: 'text-on-path', name: 'Chữ chảy theo đường cong', hint: 'Dòng chảy, hành trình, câu dài.', items: false, light: false },
  { id: 'paper-stamp', name: 'Dấu mộc trên giấy', hint: 'Câu giá trị trên nền giấy sáng; chuyển chương.', items: false, light: true },
  { id: 'brace-expand', name: 'Ngoặc nhọn mở ra', hint: 'Chủ đề công nghệ, kỹ thuật, lập trình.', items: false, light: false },
  { id: 'marker-underline', name: 'Gạch chân bút dạ', hint: 'Nhấn MỘT từ khoá, có chất tay người.', items: false, light: false },
  { id: 'gradient-sweep', name: 'Quét sáng nạp năng lượng', hint: 'Một từ khoá cần "bùng lên" (nhanh hơn, mạnh hơn).', items: false, light: false },
  { id: 'outline-ring', name: 'Từ khoá viền, vòng đứt, bật sáng', hint: 'Một từ nặng ký, nhịp nhấn mạnh.', items: false, light: false },
  { id: 'title-demote', name: 'Tiêu đề thu nhỏ thành nhãn', hint: 'Mở chương: tiêu đề làm chủ rồi nhường chỗ cho các ý bên dưới (điền "các dòng").', items: true, light: false },
  { id: 'pill-slot', name: 'Viên thuốc đổi từ như máy xèng', hint: 'Câu "chúng tôi lo ___": liệt kê nhiều ý ngắn ở cuối câu (điền "các dòng").', items: true, light: false },
  { id: 'pill-chip', name: 'Viên chip trên nền giấy (có bóng mờ)', hint: 'Như viên thuốc nhưng nền sáng, nhẹ nhàng.', items: true, light: true },
  { id: 'vertical-roll', name: 'Từ cuối cuộn dọc như bánh xe', hint: '"Dành cho ___": nhiều đối tượng/lựa chọn nối nhau (điền "các dòng").', items: true, light: false },
  { id: 'glitch-cycle', name: 'Dòng trạng thái nhiễu kiểu máy', hint: 'Báo trạng thái, giọng máy, công nghệ (điền "các dòng" là các trạng thái).', items: true, light: false },
  { id: 'column-converge', name: 'Hai cột hợp lại thành câu', hint: 'Một từ cố định + nhiều từ thay nhau rồi chốt thành cụm (điền "các dòng").', items: true, light: false },
  { id: 'relay-filmstrip', name: 'Thẻ trang chạy cạnh từ thay thế', hint: '"Một chủ thể × nhiều khả năng" (điền các khả năng).', items: true, light: false },
  { id: 'relay-geometry', name: 'Mỗi từ một hình học riêng', hint: '3-5 ý lợi ích, mỗi ý một hiệu ứng (điền "các dòng").', items: true, light: false },
  { id: 'type-retype', name: 'Gõ sai, xoá, gõ lại cho đúng', hint: 'Câu "tự sửa lời": "các dòng" gồm từ gõ trước (nhạt) và từ đúng.', items: true, light: false },
  { id: 'countdown-arc', name: 'Mặt đồng hồ quay dừng ở một số', hint: 'Câu bắt đầu bằng một chữ số (ví dụ "5 phút để cài").', items: false, light: false },
  { id: 'karaoke-fill', name: 'Tô sáng từng từ theo lời đọc', hint: 'Câu dài đọc to, từng từ sáng dần theo lời.', items: false, light: false },
  { id: 'weight-pump', name: 'Nét chữ đập theo nhịp', hint: 'Câu ngắn trên nền có nhịp (nhạc mạnh).', items: false, light: false },
  { id: 'flying-words', name: 'Từ khoá bay xuyên màn hình', hint: 'Nền "nhiều thông tin": liệt kê khái niệm (điền "các dòng") quanh câu chính.', items: true, light: false },
] as const satisfies readonly TextShotMeta[];

export type TextShotId = (typeof TEXT_SHOT_META)[number]['id'];
export const TEXT_SHOT_IDS: TextShotId[] = TEXT_SHOT_META.map((m) => m.id);
