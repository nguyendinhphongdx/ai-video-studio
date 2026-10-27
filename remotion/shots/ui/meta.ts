// The looks of a software-window scene: what happens inside an app window. Pure data (no React): the block definition and the
// editor read it; the drawing is in looks.tsx, keyed by the same ids. Ideas adapted from the ui-entrance and interaction
// recipes of video-shotcraft (Apache-2.0), see NOTICE.
export interface UiLookMeta {
  id: string;
  name: string;
  hint: string;
  /** A cursor travels to the `target` item and clicks it. */
  click: boolean;
}

export const UI_LOOK_META = [
  { id: 'cards-fly', name: 'Thẻ bay vào cửa sổ', hint: 'Giới thiệu một bộ tính năng hoặc nội dung cùng lúc.', click: false },
  { id: 'rows-cascade', name: 'Danh sách trượt vào lần lượt', hint: 'Liệt kê các mục theo thứ tự, nhấn mục cuối.', click: false },
  { id: 'stack-fan', name: 'Chồng thẻ xoè quạt', hint: 'Nhiều lựa chọn hoặc nhiều phiên bản của một thứ.', click: false },
  { id: 'click-select', name: 'Con trỏ chọn một mục', hint: 'Chỉ ra mục được chọn và chi tiết của nó.', click: true },
  { id: 'chip-filter', name: 'Bấm nhãn để lọc thẻ', hint: 'Hiển thị việc tìm đúng thứ cần giữa nhiều thứ.', click: true },
  { id: 'toggle-switch', name: 'Bật một công tắc', hint: 'Một thiết lập đổi mọi thứ; mục cần bật nằm ở target.', click: true },
  { id: 'type-search', name: 'Gõ tìm kiếm ra kết quả', hint: 'Mở đầu bằng một câu hỏi rồi đưa danh sách trả lời.', click: false },
  { id: 'notify-stack', name: 'Thông báo nảy lên chồng nhau', hint: 'Sự việc dồn dập, tin nhắn, cảnh báo.', click: false },
  { id: 'tab-switch', name: 'Chuyển tab', hint: 'So sánh các mặt của một ý; target là tab dừng lại.', click: true },
  { id: 'progress-done', name: 'Thanh tiến trình chạy tới xong', hint: 'Một quá trình có kết quả: cài đặt, xử lý, hoàn tất.', click: false },
] as const satisfies readonly UiLookMeta[];

export type UiLookId = (typeof UI_LOOK_META)[number]['id'];
export const UI_LOOK_IDS = UI_LOOK_META.map((m) => m.id) as [UiLookId, ...UiLookId[]];

/** Frame at which the cursor clicks in the looks that click. */
export const CLICK_FRAME = 54;
