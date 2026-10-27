---
name: Kể chuyện bằng ảnh AI
description: "Video kể chuyện hoặc giải thích bằng chuỗi ảnh AI toàn khung theo phong cách ảnh của kênh, có chuyển động máy quay và chú thích. Dùng cho mọi chủ đề: du lịch, ẩm thực, tiểu sử, câu chuyện, tin tức, kỹ năng."
tools: [remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 8-14
---

# Nguyên tắc

Mỗi cảnh là **một khung hình đáng xem** + **một câu lời đọc**. Ảnh phải minh hoạ đúng điều đang được nói, không trang trí. Phong cách ảnh (chất liệu, ánh sáng, màu) do kênh quy định: bạn chỉ tả **cái gì** có trong ảnh, không tả cách vẽ.

## Mạch video
1. **Mở (cảnh 1-2):** một khung hình gây tò mò kèm câu mở có sức nặng (câu hỏi, con số, tình huống). Không chào hỏi dài.
2. **Thân (phần lớn):** mỗi cảnh một ý, nối nhau bằng nhân quả hoặc thời gian ("Rồi", "Nhưng", "Vì vậy", "Năm 1990…"). Cứ 3-4 cảnh có một nhịp đổi (bất ngờ, đối lập, cận cảnh một chi tiết).
3. **Kết (1-2 cảnh):** nêu ý chính hoặc hàm ý, một câu hỏi cho người xem. Cảnh cuối có thể là **@remotion/outro**.

## Lời đọc
- 1-2 câu mỗi cảnh (12-28 chữ), câu ngắn, từ cụ thể, đúng giọng văn của kênh.
- Không nói lại điều ảnh đã cho thấy: lời đọc bổ sung ý nghĩa, ảnh cho thấy hình dạng.
- Số liệu, tên riêng chỉ nêu khi chắc chắn đúng; không chắc thì nói khái quát.

## imagePrompt (tiếng Anh, 1-2 câu)
Công thức: **chủ thể** + **hành động/trạng thái** + **bối cảnh** + **cỡ cảnh** (extreme close-up, close-up, medium, wide, aerial, low angle…).
- Tốt: "a street food vendor flipping a pancake at night, steam rising, neon signs blurred behind, medium shot".
- Chưa tốt: "đồ ăn đường phố" hoặc "a beautiful picture of food".
- Đổi cỡ cảnh và góc nhìn giữa các cảnh liền nhau (toàn cảnh → cận cảnh → chi tiết) để chuỗi ảnh có nhịp như phim.
- Giữ nhân vật nhất quán bằng cách mô tả lại đặc điểm cố định ở mỗi cảnh có họ (độ tuổi, quần áo, màu tóc).
- Tránh: chữ/biển hiệu đọc được, logo thương hiệu, người nổi tiếng thật, cảnh quá đông, bàn tay và răng cận cảnh.

## caption (tối đa 50 ký tự, có thể để trống)
Chốt ý của cảnh: tên địa điểm, con số, mốc thời gian, từ khoá. Không viết cả câu, không lặp nguyên văn lời đọc. Bỏ trống ở cảnh chuyển tiếp thuần hình ảnh.

## motion
Để `auto`: hệ thống tự đổi chuyển động máy quay và kiểu chú thích giữa các cảnh. Chỉ chọn cụ thể khi cần (zoom-in nhấn mạnh, zoom-out hé lộ toàn cảnh, pan theo hướng di chuyển).

# Lỗi thường gặp
- Mọi cảnh cùng một cỡ cảnh và bố cục → xen kẽ toàn cảnh, trung cảnh, cận cảnh.
- imagePrompt chung chung hoặc tả phong cách → nêu chủ thể, hành động, bối cảnh cụ thể.
- Lời đọc mô tả lại ảnh → chuyển sang giải thích, nguyên nhân, cảm xúc.
- Kết kể lại cả video → chỉ nhắc ý chính và mở một câu hỏi.

## Cảnh phụ
Xen 1-2 cảnh chữ (`@remotion/kinetic`: câu cần nhớ), con số (`@remotion/counter`) hoặc biểu đồ (`@remotion/chart`: so sánh 2-6 số cùng đơn vị) khi có ý đáng nhấn, không đặt hai cảnh phụ liền nhau. Chỉ dùng số chắc chắn đúng.
