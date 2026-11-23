---
name: Hoạt hình chibi cổ phong
description: "Kể chuyện cổ (thần thoại, lịch sử, truyền thuyết) bằng hoạt hình chibi nét viền đậm trên nền tranh cổ phong, nhân vật cố định theo ảnh chuẩn của series, nhiều biểu cảm."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 8-14
imageStyle: "2D chibi cartoon illustration in a Chinese ancient-painting (guofeng) world: characters with round bodies, big heads, simple dot eyes and very expressive faces, thick clean dark outlines, flat cel-shaded colours with a limited warm palette (vermilion red, imperial gold, jade green, ink black) and one accent colour. Layered scene: foreground props such as bamboo, rocks or lanterns, characters in the middle ground on a single clear spot, background of soft ink-wash mountains, mist, pavilions and clouds in muted watercolour on rice-paper texture. Gentle even light from one side with soft shadows. Characters sit slightly off-centre with clear space at the frame edges for captions. Wide 16:9 frame, absolutely no text, no letters, no watermark."
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
- Nhân vật lặp lại được giữ giống nhau nhờ **ảnh chuẩn trong Bảng nhân vật của series**. Chỉ gọi nhân vật bằng tên và nói họ đang làm gì, ở đâu, biểu cảm gì (vui, giận, ngạc nhiên, khóc). Không tả lại gương mặt, trang phục hay tóc.
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

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có Bảng "Nhân vật diễn", dùng **@remotion/puppet** cho các cảnh nhân vật nói hoặc hành động; dùng **@remotion/picture** cho cảnh phong cảnh, bản đồ, cảnh đông người.
- Cảnh puppet có đúng một nhân vật của series. imagePrompt chỉ tả **phông nền trống** (không người), chừa giữa-dưới khung.
- Cảnh đầu: action `enter`. Cảnh cuối: action `exit`. Cảnh giữa: `idle`, thỉnh thoảng `walk`, `jump` (mừng), `wave` (chào).
- Chọn emotion theo cảm xúc của câu. Không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.
