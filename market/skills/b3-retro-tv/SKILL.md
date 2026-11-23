---
name: Truyền hình cũ
description: "Hình bóng người trắng xám trên nền tối, nhiều khoảng trống, chữ in hoa gọn và một lớp hiệu ứng phát sóng analog tiết chế. Hợp truyện bí ẩn, đêm khuya, tài liệu ngắn."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 8-14
imageStyle: "Retro television broadcast look on a dark, nearly black field. Refined white and light-grey silhouettes of people with blank circular heads, rounded joints and readable gaps between limbs and body, no facial features, clean soft edges. Simple furniture, doorways and props as cut-out shapes. Generous negative space with one clear subject and strong contrast, a single faint cool light source. One restrained analog-broadcast finish only: gentle scanline texture, slight screen vignette and a barely visible phosphor glow, never heavy glitch. Mostly monochrome with at most one muted accent colour such as dim amber or signal red. Connectors and arrows, when present, are clean directed lines. Space reserved for compact uppercase captions. Wide 16:9 frame, no text, no letters, no watermark, no photorealism."
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
Nền tối gần đen. Bóng người **trắng và xám nhạt sạch, đầu tròn trống, khớp bo tròn và có khe hở dễ đọc** giữa chi và thân. Nhiều khoảng trống quanh một chủ thể. **Một** lớp hiệu ứng phát sóng analog tiết chế (vạch quét mờ, viền tối góc khung, ánh lân quang nhẹ) dùng như lớp hoàn thiện, không phải hành động; không giật nhiễu nặng.

## Chữ và mũi tên
Chữ in hoa gọn, màu trắng, ngắn, không có nhãn "tên người nói". **Mỗi mũi tên là một đường nối có hướng và có mục đích** (nguyên nhân → kết quả); không dùng mũi tên trang trí.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Nhân vật là bóng trắng không mặt nên biểu cảm đi qua tư thế và nhịp động; dùng ít emotion (neutral, surprised, sad) và để cảnh tĩnh lâu hơn.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- Lớp hiệu ứng analog (vạch quét, nhiễu, bloom) chưa là hiệu ứng hậu kỳ của video: hiện chỉ có thể xin trong ảnh AI.
- Mũi tên có hướng hiện nằm trong ảnh, chưa có mũi tên động nối hai vật theo thời gian.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
