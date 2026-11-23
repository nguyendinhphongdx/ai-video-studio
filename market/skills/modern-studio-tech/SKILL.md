---
name: Studio công nghệ hiện đại
description: "Phòng studio trắng sáng, sàn lưới xám mờ, giao diện kính phát sáng xanh lam; nhân vật mũ len đỏ áo vàng. Hợp video công nghệ, sản phẩm, khoa học đời thường. Có biến thể kể chuyện điện ảnh nhiều màu."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 8-14
imageStyle: "Modern tech studio look: a high-key white studio with a faint light-grey perspective floor grid and soft even lighting. Floating glowing cyan and electric-blue glass interface panels, diagrams and icons hover near the subject, with crisp edges and gentle bloom. The recurring character is a simple stick-limbed figure with a smooth red beanie, a yellow t-shirt, shorts, thin black arms and legs, and minimal dot eyes. Show physical actions only: pointing, lifting, walking, leaning in. Clean flat shading with a subtle soft floor shadow, polished and optimistic, uncluttered composition with the subject on one side and the interface on the other. Wide 16:9 frame, no text, no letters, no watermark, no photorealistic skin."
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
Phòng studio **trắng sáng**, sàn có lưới phối cảnh xám rất mờ, ánh sáng đều. Giao diện kính phát sáng xanh lam/xanh điện nổi cạnh nhân vật để minh hoạ khái niệm. Nhân vật: **mũ len đỏ trơn, áo phông vàng, quần short, tay chân que đen, mắt chấm tối giản**. Chỉ diễn **hành động vật lý** (chỉ, nhấc, bước, nghiêng người), không diễn bằng nét mặt phức tạp.

## Biến thể "kể chuyện điện ảnh"
Khi chủ đề là một câu chuyện thay vì giải thích, kênh có thể đổi sang bản nhiều màu: ánh sáng khối, độ sâu trường ảnh mềm, bối cảnh thật hơn nhưng giữ nguyên nhân vật mũ đỏ áo vàng. Chọn một bản cho cả series.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Nhân vật mũ đỏ áo vàng đứng lệch một bên (`left` hoặc `right`) để chừa chỗ cho giao diện kính ở bên kia; cảnh giao diện, biểu đồ đặt ở @remotion/picture hoặc @remotion/chart.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- Giao diện kính hiện là một phần của ảnh nền AI, chưa có lớp UI động (số liệu chạy, panel trượt vào) đúng theo thời gian lời đọc; dùng @remotion/counter và @remotion/chart cho số liệu.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
