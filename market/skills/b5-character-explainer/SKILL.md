---
name: Người dẫn giải thích
description: "Giải thích bằng tiêu đề lớn kiểu tạp chí trên giấy ấm, mực đậm điểm đỏ; người dẫn hoạt hình trừu tượng ở góc phải dưới, người que ẩn danh minh hoạ bên trái. Hợp video giải thích, kỹ năng, hỏi đáp."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 8-14
imageStyle: "Editorial explainer illustration on warm off-white paper with dark ink lines and a restrained red accent used sparingly. Clean, confident graphic composition: the left stage shows anonymous stick figures acting out a physical situation in a simple scene made of a few flat shapes with bold outlines, and the lower right corner leaves room for a distinctive abstract cartoon presenter character. Large editorial headline space at the top, strong visual hierarchy, plenty of paper-coloured negative space, and room on the right for up to three short caption lines. Physical events are drawn with clarity: anticipation, contact, force transfer, an exaggerated result and rebound. Flat colour, thick dark contour lines, minimal texture, no gradients. Wide 16:9 frame, no text, no letters, no watermark, no photorealism."
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
Giấy ấm, mực đậm, **điểm đỏ tiết chế**, tiêu đề lớn kiểu tạp chí. Bố cục cố định: **sân khấu bên trái** là người que ẩn danh diễn tình huống; **góc phải dưới** là người dẫn hoạt hình trừu tượng (nhân vật của series) nhận xét và nói; **bên phải** có chỗ cho tối đa ba dòng chữ ngắn.

## Sự kiện vật lý
Khi cảnh có chuyển động vật lý, mô tả đủ chuỗi: **chuẩn bị, va chạm, truyền lực, kết quả phóng đại, nảy lại**. Mỗi cảnh một chuỗi nhân quả rõ.

## Mạch giải thích
1. Tình huống hoặc câu hỏi quen thuộc.
2. Hiểu lầm phổ biến, rồi nguyên nhân thật.
3. Chốt bằng một quy tắc dễ nhớ (cảnh kinetic hoặc counter).

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Nhân vật của series là người dẫn: đặt side `right`, thường `idle` với emotion theo ý nhận xét; không dùng `walk` liên tục. Cảnh minh hoạ tình huống dùng @remotion/picture với người que ẩn danh ở bên trái.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- Người dẫn **chỉ tay, nhấn theo từ khoá** và người que bên trái **diễn động tác theo chuỗi** cần hoạt hình tay chân theo xương (IK) và đồng bộ theo từ: chưa có. Người dẫn hiện chỉ đổi sprite biểu cảm, nhép miệng và nhún nhẹ.
- Hai sân khấu cùng lúc (người dẫn + người que động) trong **một cảnh** chưa có: một cảnh là puppet hoặc picture, không ghép.
- Tối đa ba dòng chữ ngữ nghĩa ở bên phải: dùng caption ngắn, chưa chia dòng tự động.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
