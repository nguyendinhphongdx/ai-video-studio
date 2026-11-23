---
name: Hoạt hình meme động
description: "Phim hoạt hình meme cố tình xấu có chủ ý: đầu dẹt lệch, mí mắt nặng, nét mực một nét, mảng màu lem cọ, phụ đề trắng đậm viền tối. Hợp truyện hài, sử vui, chuyện lạ, ưu tiên khung dọc."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 10-16
imageStyle: "Deliberately imperfect painted meme cartoon. Characters have an asymmetric, slightly flattened white head, an uneven jaw, heavy short eyelids, uneven eyebrows and an off-centre mouth, a sparse crooked clothed torso, and arms drawn as pressure-varying single-stroke ink lines. Broad matte colour masses with visible brush boundaries and rough edges, near-white faces with a pale violet underside, warm diffuse room light. Settings, clothing and silhouettes are accurate to the period and place but exaggerated for comedy, with clear readable action. Expressions are dry, deadpan or overreacting, never cute. Keep the lower area uncluttered for a bold caption. Wide 16:9 frame, no text, no letters, no watermark, no photorealism, no clean vector look."
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
**Cố tình không hoàn hảo**: đầu trắng dẹt, lệch, hàm không đều, **mí mắt nặng ngắn, lông mày lệch, miệng lệch tâm**, thân thưa hơi vẹo mặc đồ, tay là **một nét mực đậm nhạt theo lực tay**. Mảng màu phẳng đục, thấy rõ ranh giới cọ. Mặt gần trắng với phần dưới tím nhạt, ánh sáng phòng ấm khuếch tán. **Trang phục và bóng dáng đúng thời và nơi nhưng phóng đại** cho hài. Biểu cảm khô, tỉnh bơ hoặc phản ứng quá đà, không dễ thương.

## Chữ
Phụ đề **trắng đậm dày, viền tối**, ngắn, nằm dải dưới. Bố cục chính của phong cách này là **khung dọc 9:16**.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Nhân vật nên là một "gương mặt meme" nhất quán; dùng emotion mạnh (surprised, angry, sad) và cảnh ngắn nhịp nhanh. Cảnh bối cảnh lịch sử hoặc nhiều người dùng @remotion/picture.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- **Khung dọc 9:16 chưa xuất được** (ứng dụng chỉ dựng ngang 16:9; xuất dọc là việc ở giai đoạn 3 và cần kiểm tra lại bố cục các block). Hiện dùng được phong cách ảnh nhưng đừng hứa bản dọc.
- Tay vẽ một nét chuyển động và "đầu meme" biến dạng theo nhịp chưa có (cần hoạt hình theo xương).
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
