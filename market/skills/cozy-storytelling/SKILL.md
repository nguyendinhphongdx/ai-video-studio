---
name: Kể chuyện ấm cúng
description: "Nhân vật tối giản biểu cảm trong thế giới hoạt hình 2D đủ màu, bố cục như phim. Hợp truyện đời thường, cảm xúc, hài nhẹ."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 10-16
imageStyle: "Cozy full-colour 2D cartoon storytelling with clear cartoon contours and cinematic framing. The protagonist is an expressive minimalist character: a white filled round head, two small dark oval eyes, simple eyebrows and a short curved mouth, a slim tapered torso and single-line limbs, no hair and no accessories, exactly two arms and two legs. Environments are rich and warm, painted in flat colour with soft gradients: apartments, cafes, streets, parks, buses, workplaces, with atmosphere carried by the background, light through windows and small lived-in details. Each scene is a different recognisable location, composed like a film still with a clear foreground, middle ground and background. Gentle warm lighting, friendly mood. Wide 16:9 frame, no text, no letters, no watermark, no photorealism."
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
Hoạt hình 2D đủ màu, nét viền rõ, bố cục như phim. Nhân vật chính: **đầu tròn tô trắng, hai mắt oval đen nhỏ, lông mày đơn giản, miệng cong ngắn, thân thon, tay chân một nét, không tóc, không phụ kiện, đúng hai tay hai chân**. Không khí nằm ở **bối cảnh**: ánh sáng, đồ vật nhỏ, chi tiết đời sống.

## Cấu trúc kể
- Mỗi đoạn truyện có **một địa điểm mới dễ nhận ra**; khi chuyển cảnh, lời đọc nêu một **mối nối có tên** (một đồ vật, một câu nói, một khoảnh khắc) để người xem hiểu vì sao sang chỗ mới.
- Khung hình dùng tiền cảnh, trung cảnh, hậu cảnh; đừng đặt nhân vật giữa nền trống.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Nhân vật chính giữ đúng thiết kế tối giản (không thêm tóc, phụ kiện). Đặt nhân vật ở hàng thứ hai của khung, nền puppet vẫn là phòng/phố có chiều sâu.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- "Mối nối có tên" giữa các địa điểm là việc của lời đọc và imagePrompt; ứng dụng chưa có chuyển cảnh tự dựng theo đồ vật nối.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
