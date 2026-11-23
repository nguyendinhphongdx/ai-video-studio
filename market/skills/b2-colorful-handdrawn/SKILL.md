---
name: Vẽ tay nhiều màu
description: "Người que đầu tròn mắt chấm trên giấy ấm, đồ vật và bối cảnh vẽ tay màu dịu, tiêu đề viết tay. Hợp truyện đời thường, giáo dục, kể nhẹ nhàng."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 8-14
imageStyle: "Colorful hand-drawn storybook look on warm cream paper with a subtle grain. Irregular fine ink contours around everything. Round-headed stick figures with sparse dot eyes and a short line mouth, simple bodies drawn as clean lines. Props and environments are recognisable and hand-drawn, filled with muted, varied colours such as dusty teal, soft coral, mustard yellow, sage green and lavender, with simple graphic depth through overlapping layers rather than realistic perspective. Rooms, streets and landscapes are simple but full of small charming details. Calm, friendly mood, one clear subject per frame, with empty space near the bottom for a compact ivory paper caption label. Wide 16:9 frame, no text, no letters, no watermark, no photorealism, no glossy 3D."
---

# Nguyên tắc

Mỗi cảnh là **một khung hình đáng xem** + **một câu lời đọc**. Hình minh hoạ đúng điều đang được nói, không trang trí. Cách vẽ (nét, màu, nền, ánh sáng) do kênh quy định trong "Phong cách ảnh AI": bạn chỉ tả **ai làm gì, ở đâu**, không tả cách vẽ.

## Mạch video
1. **Mở (cảnh 1-2):** một tình huống gây tò mò kèm câu mở có sức nặng (câu hỏi, con số, mâu thuẫn). Không chào hỏi dài.
2. **Thân (phần lớn):** mỗi cảnh một ý, nối nhau bằng nhân quả hoặc thời gian ("Rồi", "Nhưng", "Vì vậy"). Cứ 3-4 cảnh có một nhịp đổi: bất ngờ, đối lập, cận cảnh một chi tiết.
3. **Kết (1-2 cảnh):** nêu ý chính hoặc hàm ý và một câu hỏi cho người xem. Cảnh cuối có thể là **@remotion/outro**.

## Lời đọc
- 1-2 câu mỗi cảnh (12-28 chữ), câu ngắn, từ cụ thể, đúng giọng của kênh.
- Lời đọc bổ sung ý nghĩa, không kể lại điều hình đã cho thấy.
- Số liệu và tên riêng chỉ nêu khi chắc chắn đúng; không chắc thì nói khái quát.

## imagePrompt (tiếng Anh, 1-2 câu)
Công thức: **chủ thể** + **hành động hoặc trạng thái** + **bối cảnh** + **cỡ cảnh** (close-up, medium, wide, high angle...). Đổi cỡ cảnh giữa các cảnh liền nhau để chuỗi ảnh có nhịp. Nhân vật lặp lại được giữ giống nhau nhờ **ảnh chuẩn trong Bảng nhân vật của series**: chỉ gọi tên, nói họ làm gì và biểu cảm gì, không tả lại gương mặt hay trang phục. Tránh chữ đọc được trong ảnh, logo, người nổi tiếng thật, đám đông dày.

## caption (tối đa 50 ký tự, có thể để trống)
Chốt ý của cảnh bằng một từ khoá, con số hoặc mốc thời gian; không chép lại lời đọc.

## Cảnh phụ
Xen 1-2 cảnh chữ (`@remotion/kinetic`), con số (`@remotion/counter`) hoặc biểu đồ (`@remotion/chart`) khi có ý đáng nhấn; không đặt hai cảnh phụ liền nhau. Chỉ dùng số chắc chắn đúng.

## Phong cách
Giấy kem ấm, **nét mực mảnh không đều** quanh mọi thứ. Người que đầu tròn, **mắt chấm thưa, miệng một nét ngắn**. Đồ vật và bối cảnh vẽ tay dễ nhận ra, tô màu dịu khác nhau (xanh ngọc xám, cam san hô, vàng mù tạt, xanh xô thơm, tím oải hương), chiều sâu đơn giản bằng các lớp chồng nhau.

## Chữ
Tiêu đề cảnh viết tay; chú thích là **nhãn giấy màu ngà gọn, chữ mực đậm**. Không dùng chữ nhấp nháy hay karaoke.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Nhân vật nhỏ nhắn đứng giữa-dưới trên nền căn phòng hoặc con đường nhiều màu; đồ vật phía sau là điểm nhìn thứ hai.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- Chữ tiêu đề viết tay và nhãn giấy ngà là kiểu chữ/caption của video, chưa có bộ font viết tay riêng cho từng phong cách.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
