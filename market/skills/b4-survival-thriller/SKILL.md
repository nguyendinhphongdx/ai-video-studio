---
name: Sinh tồn kịch tính
description: "Người que đầu tròn trắng, mặt đen tối giản, găng tay trắng trên nền sơn màu bóng cel tiết chế; nỗi sợ kể bằng bằng chứng trong khung hình. Hợp truyện sinh tồn, hồi hộp, kinh dị nhẹ."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 10-16
imageStyle: "2D survival-thriller cartoon with clear, slightly organic black contours and broad painted colour fields with restrained cel shadows. Detailed, readable 2D environments such as cabins, forests, bunkers, vehicles and roads at dusk or night, with a controlled palette and one strong light source casting hard shadows. Characters are stick figures with white circular heads, a minimal black face, black stick bodies and limbs, and compact rounded white gloves with a readable thumb. Tension comes from evidence inside the frame: a silhouette in a window, a door that should be closed, a spatial contradiction, an object that changed state. Strictly 2D: no glossy concept art, no realistic skin, no bloom, no gore, no invented monsters. Keep the lower part of the frame calm for a one-line caption. Wide 16:9 frame, no text, no letters, no watermark."
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
Nét viền đen rõ, hơi uốn tự nhiên; mảng màu sơn rộng với bóng cel tiết chế; môi trường 2D chi tiết nhưng dễ đọc; một nguồn sáng mạnh đổ bóng cứng. Nhân vật: **đầu tròn trắng, mặt đen tối giản, thân và chi que đen, găng tay trắng bo tròn có ngón cái rõ**. Không ảnh thật, không da thật, không bloom, không 3D bóng.

## Nhịp hồi hộp
- **Nỗi sợ đến từ bằng chứng**: bóng người ngoài cửa sổ, cánh cửa lẽ ra đã đóng, chi tiết không gian vô lý, đồ vật đổi trạng thái giữa hai cảnh. **Không bịa quái vật.**
- Mỗi cảnh thêm đúng một manh mối; cảnh sau cho thấy hệ quả.
- **Ba giây đầu phải có một thay đổi hình ảnh được thiết kế sẵn** (ví dụ một vật xuất hiện, đèn tắt) và **không có đoạn dài quá 3 giây mà khung hình không đổi gì**: chia cảnh ngắn hoặc đổi cỡ cảnh.
- Phụ đề một dòng, chữ đậm bo tròn trắng ngà viền tối.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Nhân vật đi hoặc đứng trong môi trường "bình thường"; dùng `walk` để tạo cảm giác bị theo dõi và cảnh `idle` ngắn trước khi lộ manh mối.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- Quy tắc "không quá 3 giây không đổi hình" chưa được kiểm tự động (cổng chất lượng ở giai đoạn 3 của kế hoạch): tự giữ bằng cách chia cảnh ngắn (4-6 giây là mức tối thiểu của cảnh puppet hiện nay, nên ưu tiên @remotion/picture cho cảnh cần cắt nhanh).
- Chữ mở đầu thiết kế riêng và phụ đề bo tròn viền tối chưa phải kiểu chữ riêng của phong cách này.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
