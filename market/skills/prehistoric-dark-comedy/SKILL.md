---
name: Tiền sử hài đen
description: "Hoạt hình 2D vẽ thô: người que đầu tròn trắng, áo da thú, hang động và trại lửa tông đất. Hợp truyện châm biếm, hài đen về đời sống hiện đại đặt trong thời tiền sử."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 8-14
imageStyle: "Crude hand-drawn 2D cartoon with irregular, wobbly black outlines and a subtle paper texture. Characters have white filled round heads, thin black stick limbs and very expressive eyes, eyebrows and mouths, wearing simple animal-hide clothing and bone or stone accessories. Earthy palette of ochre, brown and dusty green with warm orange fire accents and deep shadows. Settings are caves, camps around a fire, forests and rocky plains, drawn simply with scribbly texture and visible pencil-like strokes. Dark comedy mood, exaggerated reactions, clear single focal action per frame. Characters of different ages are told apart by proportions, hair shape and costume silhouette, not by colour alone. Wide 16:9 frame, no text, no letters, no watermark, no photorealism."
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
Vẽ thô 2D, nét viền đen không đều, hạt giấy nhẹ. Nhân vật đầu tròn tô trắng, tay chân que đen mảnh, **mắt, lông mày, miệng rất biểu cảm**, mặc đồ da thú. Màu đất: nâu, vàng đất, xanh lá xám, lửa cam ấm. Bối cảnh: hang, trại lửa, rừng, đồng đá.

## Thẻ nhân vật (cast card)
Mỗi vai lặp lại cần một thẻ ghi trong Bảng nhân vật: **độ tuổi, tỉ lệ cơ thể, kiểu tóc, hình dáng trang phục, một phụ kiện đặc trưng, và ít nhất hai điểm khác biệt không dựa vào màu** (ví dụ cao/thấp, béo/gầy, tóc xù/trọc). Có vậy khán giả mới phân biệt được các vai.

## Lưu ý nội dung
Đây là **châm biếm**, không phải lịch sử thật. Đừng trình bày chi tiết hư cấu như sự thật khảo cổ; nếu nhắc tới sự kiện thật, nói rõ đâu là thật, đâu là đùa.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Một nhân vật chính có sprite biểu cảm mạnh (giận, ngạc nhiên, buồn) để hài; các vai phụ và đám đông dùng @remotion/picture.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- Chỉ một nhân vật puppet mỗi cảnh: hội thoại qua lại giữa hai vai tiền sử phải chia thành các cảnh luân phiên (đổi `side`), chưa có hai nhân vật cùng khung.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
