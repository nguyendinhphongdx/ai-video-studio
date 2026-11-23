---
name: Hoạt hình lịch sử
description: "Hoạt hình 2D tô bóng cel, nét viền đen dày, bối cảnh lịch sử vẽ màu đầy đủ, nhân vật đầu tròn trắng nhẵn. Có gói thời đại cho mỗi câu chuyện. Hợp kể sử, tiểu sử, sự kiện."
tools: [remotion/puppet, remotion/picture, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 10-16
imageStyle: "Polished 2D cel-shaded historical cartoon with thick, clean black outlines and soft metallic shading on armour, tools and objects. Full-colour painted period settings with a restrained palette of four to six named colours chosen for the era. Characters are smooth white round heads with black oval eyes without irises, no nose, and thin black stick limbs, dressed in accurate period wardrobe and carrying period props. Backgrounds are richly detailed architecture, landscapes and interiors of the specified period and region, with atmospheric depth and clear lighting. Compositions are dramatic but readable, one main action per frame. Wide 16:9 frame, no text, no letters, no watermark, no photorealism, no modern objects."
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
Hoạt hình 2D tô bóng cel, **nét viền đen dày sạch**, bóng kim loại mềm trên giáp và đồ vật. Bối cảnh lịch sử vẽ đủ màu. Nhân vật: **đầu tròn trắng nhẵn, mắt oval đen không tròng, không mũi, tay chân que đen mảnh**, mặc trang phục đúng thời.

## Gói thời đại (era pack) cho mỗi câu chuyện
Trước khi viết cảnh, ghi vào hướng dẫn series một gói gồm:
- thời kỳ và vùng (ví dụ: Đại Việt, thế kỷ 13, đồng bằng sông Hồng);
- trang phục chính cho từng tầng lớp;
- **4-6 màu có tên** làm bảng màu cả truyện;
- đạo cụ chính và **số lượng** (ví dụ: 3 thuyền chiến, 1 trống đồng) để cảnh sau không đổi số;
- danh sách **sự thật đã kiểm chứng** và **phần minh hoạ tưởng tượng**, để lời đọc không nói điều tưởng tượng như sự thật.

## Thẻ nhân vật
Mỗi nhân vật lặp lại có thẻ: tuổi, tỉ lệ, kiểu tóc/mũ, hình dáng trang phục, một phụ kiện, và hai điểm khác biệt ngoài màu.

## Cảnh có nhân vật diễn (@remotion/puppet)
Khi series đã có mục "Nhân vật diễn" trong Bảng nhân vật, dùng **@remotion/puppet** cho cảnh nhân vật nói hoặc hành động và **@remotion/picture** cho cảnh phong cảnh, đồ vật, nhiều nhân vật.
- Dùng puppet cho người kể hoặc nhân vật chính nói trực tiếp; cảnh trận đánh, đám đông, kiến trúc dùng @remotion/picture.
- imagePrompt của cảnh puppet chỉ tả **phông nền trống, không có người**, chừa giữa-dưới khung cho nhân vật.
- Cảnh đầu dùng action `enter`, cảnh cuối dùng `exit`, cảnh giữa dùng `idle`; thỉnh thoảng `walk`, `jump`, `wave`.
- Chọn emotion theo cảm xúc của câu, đổi side giữa các cảnh liền nhau, không để quá hai cảnh liền nhau cùng emotion và cùng side.
- Xen một cảnh @remotion/picture sau mỗi 2-3 cảnh puppet để có nhịp.

## Chưa có trong ứng dụng (đừng hứa với người xem)
- Ứng dụng không tự kiểm tra sự kiện lịch sử: số liệu và tên riêng phải do người duyệt kịch bản xác nhận.
- "Gói thời đại" là văn bản trong hướng dẫn series; chưa có màn riêng để nhập hay khoá bảng màu.
- Nhân vật diễn hiện là bộ sprite cả người theo biểu cảm: chưa có tay chân tách rời chuyển động (IK), chưa cầm hay chạm đồ vật, chưa có nhiều nhân vật hoặc hội thoại trong một cảnh puppet.
- Ảnh chỉ ra theo khổ ngang 16:9; chưa xuất khổ dọc 9:16.
