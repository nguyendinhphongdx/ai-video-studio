---
name: Noir hổ phách
description: "Nét góc cạnh, tô bóng cel tiết chế, ánh sáng hổ phách và bóng tím đậm; nhân vật đầu tròn đen mờ mắt kem. Hợp truyện bí ẩn, đô thị đêm, tội phạm, tâm lý."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 10-16
imageStyle: "Amber noir illustration with angular, confident contours and restrained cel shading. Warm amber light cuts through deep plum and aubergine shadows, layered full-colour settings with foreground silhouettes, middle-ground action and glowing background depth: rainy streets, diners, stairwells, offices, rooftops. Characters have compact matte-black round heads with short necks, small cream-white eye marks, a simple line mouth and plain black hands and limbs, so emotion is carried by posture and eye marks. Strong directional light, long shadows, a limited palette of amber, plum, cream and black with small teal accents. Moody but clean and readable. Different location in each scene. Wide 16:9 frame, no text, no letters, no watermark, no photorealism."
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
Nét viền góc cạnh, bóng cel tiết chế, **ánh sáng hổ phách và bóng tím đậm**, nền nhiều lớp đủ màu. Nhân vật: **đầu tròn đen mờ nhỏ gọn, cổ ngắn, dấu mắt trắng kem nhỏ, miệng một nét, tay chân đen đơn giản**. Biểu cảm đến từ tư thế và dấu mắt.

## Cách kể
- **Đổi địa điểm theo từng câu chuyện** (phố mưa, quán ăn, cầu thang, mái nhà...) để không giống nhau giữa các tập.
- Tiêu đề lớn màu trắng tinh ở góc trên trái và chú thích in hoa viền tối với từ đang đọc được tô màu hổ phách là phần **chữ do video thêm**, ảnh chừa trống góc trên trái và dải dưới.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Nhân vật đầu đen ít biểu cảm nên dùng emotion tiết chế, để tư thế và ánh sáng làm việc; cảnh đường phố, bóng đổ dài dùng @remotion/picture.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- Chú thích in hoa viền tối với **từ đang đọc được tô hổ phách** (karaoke) chưa có: caption hiện tại là một dòng cố định cho cả cảnh.
- Tiêu đề trắng tinh ở góc trên trái chưa có lớp riêng; dùng @remotion/kinetic cho tiêu đề.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
