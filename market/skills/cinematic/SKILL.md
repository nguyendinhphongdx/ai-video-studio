---
name: Điện ảnh đa năng
description: "Video kể chuyện, giải thích hoặc giới thiệu cho mọi chủ đề: ảnh AI theo phong cách của kênh, camera chuyển động có chiều sâu, xen cảnh chữ, con số và biểu đồ, âm thanh đi kèm. Mạch chuyện có câu hỏi, leo thang, bước ngoặt và kết."
version: 2
tags: [general, story, cinematic]
tools: [remotion/picture, remotion/vox, remotion/kinetic, remotion/counter, remotion/chart, remotion/timeline, remotion/gauge, remotion/dots, remotion/ui]
scenes: 8-14
---

# Mục tiêu

Một video **kể một câu chuyện** về chủ đề của tập, không phải danh sách ý. Người xem phải muốn biết cảnh kế tiếp. Phong cách hình (chất liệu, màu, ánh sáng) do **kênh** quy định, bạn chỉ quyết định **kể gì, theo thứ tự nào, cảnh nào trông ra sao**.

Mở đầu và phần kết của kênh được hệ thống chèn sẵn (bạn không viết). Bạn viết phần nội dung ở giữa: cảnh cuối của bạn phải là **cảnh kết trả lời**, lời chào của kênh đứng sau nó.

# Cách kể

Chọn trước, giữ xuyên suốt:
1. **Câu hỏi trung tâm**: một câu có dấu hỏi, nghe lạ hoặc ngược trực giác ("Vì sao… ?", "Điều gì xảy ra khi… ?", "Ai thực sự… ?").
2. **Câu trả lời một câu**, chỉ nói ở cảnh kết.
3. **Sợi chỉ xuyên suốt**: một hình ảnh, nhân vật, con số hay phép so sánh cụ thể, nhắc lại ở vài cảnh để các cảnh dính nhau.

| Phần | Tỉ lệ | Việc cần làm |
| --- | --- | --- |
| **Hook** | 1-2 cảnh | Nghịch lý, con số lạ hoặc chi tiết bất ngờ, rồi đặt câu hỏi. Không chào hỏi, không "trong video này". |
| **Nền** | ~20% | Vừa đủ thông tin để hiểu câu hỏi: ở đâu, khi nào, ai. |
| **Leo thang** | ~45% | Mỗi cảnh một mảnh bằng chứng, **lạ hơn hoặc hệ trọng hơn** cảnh trước. Nối bằng nhân quả ("vì vậy", "nhưng", "và rồi"). |
| **Bước ngoặt** | ~60-70% | Một chi tiết đảo hiểu biết ban đầu ("hoá ra không phải X mà là Y"). |
| **Kết** | 1-2 cảnh | Trả lời đúng câu hỏi, rồi để lại một hàm ý. Đừng kết bằng thêm một dữ kiện mới. |

Mỗi cảnh kết thúc bằng một **mồi** dẫn sang cảnh sau (câu hỏi chưa đáp, mâu thuẫn, điều sắp hé lộ) và cảnh sau mở bằng chính điều đó. Không cảnh nào khép kín như một mục riêng.

# Lời đọc: viết để NGHE

- Xen câu dài với câu rất ngắn (2-5 chữ): "Nhưng khoan.", "Chưa hết.". Đừng để mọi cảnh là một câu 18 chữ cùng khuôn.
- Nói với người xem: "bạn", vài câu hỏi thật, "Hãy tưởng tượng…".
- Từ nói hằng ngày; bỏ từ sách vở sáo rỗng ("kinh ngạc", "chấn động", "khủng khiếp"). Thay bằng chi tiết: con số, so sánh đời thường ("bằng ba sân bóng").
- Không mở hai cảnh liền bằng cùng một kiểu. Mỗi cảnh làm một việc cho mạch: hỏi, tăng cược, đảo chiều hoặc trả lời.
- Mỗi cảnh 1-3 câu, viết số bằng chữ. Giọng và xưng hô theo kênh.

# Độ chính xác

- Chỉ nêu số liệu, tên riêng, mốc thời gian **chắc chắn đúng** (ưu tiên tri thức của kênh). Không chắc thì nói khái quát và không đặt số vào chữ trên hình.
- Phân biệt sự thật đã kiểm chứng với giả thuyết ("các nhà nghiên cứu cho rằng").
- Chủ đề nhạy cảm (chính trị, thiên tai, tội phạm, tôn giáo, sức khoẻ): trung lập, nêu nhiều góc nhìn, không quy kết, không hình ảnh bạo lực hay nạn nhân thật.

# Cảnh hình: `@remotion/picture`

Một khung hình AI toàn màn hình + một dòng chú thích + chuyển động camera.
- **`imagePrompt`** (tiếng Anh, 1-2 câu): chỉ tả **cái gì có trong ảnh** (chủ thể cụ thể, một chi tiết phụ, bối cảnh). Không tả phong cách vẽ (kênh đã quy định), không chữ trong ảnh, không mặt người thật, không đám đông. Tốt: "an old fishing boat at dawn, a single lantern at the bow". Chưa tốt: "beautiful cinematic 8k image of the sea".
- **`caption`**: từ khoá, tên riêng hoặc con số ngắn khớp điều lời đọc đang nhắc. Không viết cả câu.
- **`shot`**: chọn kiểu khung hình và **đổi liên tục**: không hai cảnh liền cùng `shot`, một `shot` không quá 2 lần/video. `wide` (bối cảnh) · `close-up` (nhấn một vật) · `macro` (chi tiết nhỏ ý nghĩa lớn) · `top-down` (bản đồ, bố trí) · `low-angle` (quy mô, quyền lực) · `diagonal` (xung đột, đà) · `left-third`/`right-third` (luân phiên) · `split` (so sánh) · `scale-contrast` (chênh kích cỡ) · `frame-in-frame` (tài liệu, ký ức) · `cluster` (nhiều mảnh liên quan).
- **`fx`** (lớp ánh sáng) và **`rhythm`** (cắt nhịp): để `auto`, hầu hết cảnh sẽ sạch. Chỉ chọn riêng cho cảnh then chốt: `rhythm` `flash-freeze` cho hook hoặc bước ngoặt, `jump-punch` cho câu dồn dập, `comic-panels` cho ba góc của một chủ thể; `fx` `reticle` khi "đây chính là nó", `spotlight` khi hé lộ. Tối đa 2-3 cảnh mỗi video.
- **`motion`**: để `auto` (hệ thống đổi luân phiên). Chọn riêng khi cần: `crash-zoom` cho hook hoặc bước ngoặt (**tối đa 1-2 lần**), `orbit-left/right` cho vật thể hoặc nhân vật, `tilt-glide` cho địa điểm, `overhead` cho bản đồ hoặc tài liệu, `slide-parallax` cho hành trình hoặc dòng thời gian.

# Cảnh phụ (không cần ảnh AI, đổi nhịp)

Xen **1-3 cảnh phụ**, không đặt hai cảnh phụ liền nhau, đặt ở chỗ nhịp chuyển (sau hook, trước bước ngoặt, trước kết):
- **`@remotion/counter`**: MỘT con số then chốt lăn lên, kèm đơn vị và chú thích. Chỉ dùng số chắc chắn đúng; lời đọc nêu số bằng chữ.
- **`@remotion/chart`**: so sánh 2-6 số cùng đơn vị, mỗi dòng "Tên: số"; cột lớn nhất tự nổi bật. Lời đọc nêu **kết luận** của so sánh.
- **`@remotion/timeline`**: 2-6 mốc theo thời gian, mỗi dòng "Mốc: sự kiện"; camera trượt qua từng mốc. Dùng khi kể trình tự sự kiện.
- **`@remotion/gauge`**: đọc MỘT số đo trên thang có đầu mút (kim quét hết thang rồi về giá trị).
- **`@remotion/dots`**: nhấn một tỉ lệ ("3 trên 10") bằng đám chấm sáng lên.
- **`@remotion/kinetic`**: câu cần nhớ (câu hỏi lớn, câu chốt trước kết), tối đa 70 ký tự, một từ nhấn. Để `look` là `auto` (đổi kiểu giữa các cảnh). Muốn liệt kê nhiều ý ngắn cùng một câu ("chúng mình lo ___", "dành cho ___") thì điền `items` (mỗi dòng một ý, 2-6 dòng) để hệ thống dùng kiểu xoay ý (viên thuốc đổi từ, cuộn dọc, nhiễu máy...).

# Nhịp và đa dạng

- Mỗi cảnh một ý, một chủ thể. Đừng nhồi.
- Xen cỡ cảnh (xa, gần, cực cận) và hướng chủ thể (trái, phải, chéo); đừng để cả video chủ thể ở giữa.
- Sau cảnh dày thông tin, cho một cảnh thở (ảnh rộng, ít chữ).
- Hook và bước ngoặt là nơi dùng chuyển động mạnh; phần còn lại giữ êm.

# Ví dụ rút gọn (đề tài: Vì sao bánh mì Việt Nam nổi tiếng khắp thế giới?)

1. **Hook** `picture`, shot `macro`, motion `crash-zoom` · "Một ổ bánh mì giá hai mươi nghìn. Vậy mà người ta xếp hàng cả tiếng ở Paris để mua nó. Vì sao?" · caption "20.000 Đ"
2. **Nền** `picture`, shot `wide` · "Nó bắt đầu từ chiếc bánh baguette của người Pháp, mang sang Việt Nam hơn một trăm năm trước." · caption "BAGUETTE"
3. **Leo thang** `picture`, shot `top-down`, motion `overhead` · "Nhưng bột mì ở đây đắt. Thợ bánh phải pha thêm bột gạo. Vỏ giòn hơn, ruột xốp nhẹ hơn." · caption "BỘT GẠO"
4. **Phụ** `counter` · "Chỉ một thay đổi nhỏ, nhưng nó tạo ra ổ bánh mà baguette gốc không có." · giá trị "100", đơn vị "năm", chú thích "kể từ lần đầu đến Việt Nam"
5. **Leo thang** `picture`, shot `close-up` · "Rồi người bán đặt vào đó pate, dưa góp, rau mùi, ớt. Mỗi vị một nhịp." · caption "NHIỀU LỚP VỊ"
6. **Bước ngoặt** `picture`, shot `scale-contrast`, motion `crash-zoom` · "Và đây mới là chỗ lạ: thế giới không thích nó vì nó là bánh mì. Họ thích vì nó là cả một bữa ăn trong tay." · caption "CẢ BỮA ĂN"
7. **Phụ** `kinetic` · "Một món ăn đường phố có thể đi xa đến vậy." (nhấn "đường phố")
8. **Kết** `picture`, shot `wide`, motion `zoom-out` · "Vậy câu trả lời là: bánh mì nổi tiếng vì nó biết mình là món ăn của đường phố, nhanh, rẻ, và đủ vị. Bạn đã thử ổ bánh nào làm bạn nhớ mãi chưa?"

(Chỉ minh hoạ cấu trúc; khi viết thật, kiểm lại mọi số liệu.)

# Kiểm tra trước khi giao

- Hook nêu được câu hỏi hoặc nghịch lý trong 5 giây đầu? Cảnh kết trả lời đúng câu hỏi đó?
- Cuối mỗi cảnh có mồi dẫn sang cảnh sau? Có một bước ngoặt?
- `shot` không lặp ở hai cảnh liền nhau; cảnh phụ không liền nhau?
- Mọi số liệu chắc chắn đúng, và lời đọc nghe như người kể (có câu ngắn, có câu hỏi)?
- Mỗi `imagePrompt` chỉ tả chủ thể, tiếng Anh, không chữ, không mặt người thật?

# Lỗi thường gặp

- Cảnh nào cũng một câu dài cùng khuôn, mở bằng "Tại đây…" hoặc "Điều này…".
- Cảnh kết kể thêm dữ kiện mới thay vì trả lời.
- `imagePrompt` tả phong cách ("cinematic, 8k") hoặc nhồi nhiều chủ thể.
- Dùng `crash-zoom` ở mọi cảnh; hoặc dồn ba cảnh phụ liền nhau.
- Số liệu không chắc nhưng vẫn đặt vào `counter` hoặc `chart`.
