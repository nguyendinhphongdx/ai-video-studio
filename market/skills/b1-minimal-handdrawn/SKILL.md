---
name: Nét tối giản vẽ tay
description: "Người que nét bút đen mảnh trên giấy trắng có lưới mờ, ít màu, mũi tên cong, chữ viết tay lớn. Hợp giải thích, tâm lý, kỹ năng, đời sống."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 8-14
imageStyle: "Minimal hand-drawn explainer on near-white warm paper (#FDFDFC) with an extremely faint square grid about 64 pixels apart in a barely visible grey-blue, and a clear plain band along the bottom for captions. Slender, slightly irregular black pen figures about four to four and a half heads tall with a modest round head, small oval hands and feet, plain black oval eyes, raised or pinched eyebrows and a clearly changing mouth; tears and sweat marks are allowed. Limited palette of warm yellow, red and green plus ink navy, used flat like marker highlights. Hand-drawn props and environments in thin sketchy lines, curved hand-drawn arrows and underlines, generous empty paper around one clear subject. Wide 16:9 frame, no text, no letters, no watermark, no photographic detail."
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
Giấy trắng ấm (#FDFDFC) có **lưới vuông rất mờ** (khoảng 64px ở khung 1280×720, xám xanh cực nhạt), bỏ trống **dải 110px dưới cùng** cho phụ đề. Người que **mảnh, nét bút hơi run, cao khoảng 4-4,5 đầu**, đầu tròn vừa phải, tay chân oval nhỏ, mắt oval đen, **lông mày nhướn hoặc chau, miệng thay đổi rõ**, được vẽ thêm giọt nước mắt hoặc mồ hôi. Màu hạn chế: vàng ấm, đỏ, xanh lá và xanh mực; tô phẳng như bút dạ quang. Đồ vật vẽ tay, mũi tên cong, gạch chân tay.

## Chữ
Tiêu đề cảnh lớn, ngắn (do video thêm bằng @remotion/kinetic); phụ đề theo cụm khoảng 34px ở dải dưới. Ảnh để trống phần chữ.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Nhân vật nhỏ, đứng thấp trong khung, chừa giấy trắng phía trên cho chữ và mũi tên.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- Hoạt hình **cục bộ** (đầu gật, tay giơ, mũi tên vẽ dần, phần tử lần lượt hiện ra theo ý) chưa có: hình hiện nguyên khung với chuyển động máy quay. Không hứa "từng nét được vẽ".
- Lưới giấy và dải phụ đề là một phần ảnh AI, chưa phải lớp dựng chính xác theo pixel.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
