---
name: Vox style
description: "Video giải thích theo phong cách Vox: mạch điều tra có số liệu, mỗi cảnh một ảnh cắt dán (chủ thể viền đỏ, in lưới chấm, băng keo trên giấy kẻ ô và nền báo cũ) cùng nhãn dán và chuyển động máy quay kiểu truyền hình. Hợp lịch sử, kinh tế, khoa học, địa lý, công nghệ, hiện tượng lạ."
version: 5
imageStyle: "Vox-style documentary paper collage with real physical depth, built in three layers. FOREGROUND: a few oversized torn paper scraps, a strip of translucent masking tape or a metal pushpin, slightly out of focus at the edges, casting long hard shadows. MIDGROUND: the main subject cut out of halftone-printed paper with a thin crimson-red outline and a visible white paper edge, raised above the board on a thick drop shadow, shown at a slight three-quarter angle. BACKGROUND: a dark charcoal graph-grid paper panel with thin white grid lines and faint diagrams, laid over an aged newspaper page with blurred unreadable print, edges curling. Single directional light from the upper left with crisp raised-paper shadows, subtle paper grain and ink-bleed, muted sepia, black and cream palette with one crimson accent and at most one canary-yellow highlight. Wide 16:9 frame, composition set by each scene's shot direction, always leaving some empty paper area free for a caption sticker, absolutely no text, no letters, no watermark."
tags: [vox, explainer, collage, documentary]
tools: [remotion/vox, remotion/kinetic, remotion/counter, remotion/chart, remotion/outro]
scenes: 8-14
---

# Vox style là gì

Hai thứ đi cùng nhau, thiếu một thì không còn là Vox:

1. **Cách kể:** một video trả lời **một câu hỏi cụ thể** bằng chuỗi nguyên nhân - hệ quả có dẫn chứng, giọng điều tra đĩnh đạc, mỗi 5-8 giây có thêm một mảnh ghép.
2. **Ngôn ngữ hình ảnh:** mọi khung hình là một **tấm cắt dán trên bàn biên tập**: chủ thể được cắt ra với viền đỏ mảnh và độ nhám in lưới chấm, dán băng keo lên một tấm giấy kẻ ô tối màu, đặt trên nền báo cũ; rồi quay như phim tài liệu (zoom, lướt), phủ sọc màn hình CRT, tối góc và một nhãn dán chữ.

Trong video này **ảnh AI chỉ lo phần cắt dán** (chủ thể, giấy, băng keo, mũi tên, hình khối phụ). Chuyển động máy quay, sọc CRT, tối góc, nhãn chữ do hệ thống thêm, nên đừng tả chúng trong ảnh.

---

# Phần A. Cách kể

Trước khi viết, tự xác định ba thứ và giữ chúng xuyên suốt:
1. **Câu hỏi trung tâm** (một câu, có dấu hỏi, nghe lạ hoặc ngược trực giác).
2. **Câu trả lời trong một câu** (luận điểm chính, sẽ nói ở cảnh kết).

Dạng câu hỏi tốt: *Tại sao X lại như vậy?* (nghịch lý) · *Ai thực sự được lợi từ X?* · *Điều gì xảy ra khi X biến mất?* · *Con số này nghĩa là gì?* Tránh "X là gì?" chung chung và câu hỏi chỉ trả lời có/không.

## Cấu trúc (mỗi cảnh 5-9 giây, lời đọc 1-2 câu, 12-28 chữ)
| Phần | Tỉ lệ | Việc cần làm | Dạng hình hay dùng |
| --- | --- | --- | --- |
| **Hook** | 1-2 cảnh đầu | Nghịch lý, con số sốc hoặc chi tiết lạ + nêu câu hỏi. Không chào hỏi, không "trong video này". | vật thể to, biểu đồ gây sốc, bản đồ lạ |
| **Bối cảnh** | ~20% | Đủ thông tin nền để hiểu câu hỏi: ở đâu, khi nào, ai. | bản đồ, địa điểm, dòng thời gian |
| **Phát triển** | ~50% | Mỗi cảnh một mảnh bằng chứng, nối bằng nhân quả ("vì vậy", "nhưng", "kết quả là"). Có một **bước ngoặt** làm đảo hiểu biết ban đầu. | tài liệu, biểu đồ, cơ chế, so sánh, ẩn dụ |
| **Kết** | 1-2 cảnh | Nhắc câu trả lời trong một câu, rồi một hàm ý hoặc câu hỏi mở. Cảnh kết là một cảnh `vox` trả lời câu hỏi; **@remotion/outro** (nếu dùng) chỉ là lời chào của kênh đặt SAU cảnh kết, đừng dùng nó thay cho phần kết. | ẩn dụ, vật thể mang tính biểu tượng |

Bốn mẫu hook: *con số trước* ("Jakarta chìm 25 cm mỗi năm.") · *nghịch lý* ("Biển ba mặt mà nhập khẩu gần hết hải sản.") · *chi tiết lạ* ("Đường biên giới này gãy khúc như bị bẻ.") · *câu hỏi đảo* ("Nếu rẻ thế, vì sao bạn vẫn không mua nổi?").

## Làm mạch chuyện cuốn hút
- **Vòng mở:** hook đặt một câu hỏi mà người xem chưa thể đoán; không trả lời ngay. Mỗi cảnh trả lời một phần nhưng **mở thêm** một câu hỏi nhỏ hơn ("Vậy ai đã khoan những giếng đó?").
- **Mồi cuối cảnh:** câu cuối lời đọc của mỗi cảnh hướng sang cảnh sau ("Nhưng đó mới là nửa đầu.", "Và họ không biết điều này."). Không cảnh nào khép kín như một mục riêng.
- **Leo thang:** sắp xếp bằng chứng từ nhẹ đến nặng, từ xa đến gần, từ chung đến một con người hoặc một con số cụ thể. Cảnh giữa bài phải làm người xem ngạc nhiên hơn cảnh đầu.
- **Bước ngoặt (khoảng 60-70% bài):** một mảnh bằng chứng làm đảo cách hiểu ("hoá ra không phải X mà là Y"). Sau đó là hệ quả.
- **Chi tiết đáng nhớ:** mỗi video có 1-2 chi tiết cụ thể hay một hình ảnh so sánh dễ nhớ (bằng một sân bóng, nặng như một chiếc xe tải), thay vì khái quát.
- **Kết trả lời và mở:** nhắc đúng câu trả lời, rồi gợi một hàm ý hoặc câu hỏi cho người xem mang đi. Mở và kết mỗi video phải khác các video trước của kênh.

## Đa dạng bố cục (rất quan trọng)
Mỗi cảnh phải chọn một `shot` cụ thể. Quy tắc: **không hai cảnh liền nhau cùng shot**, **một shot không quá 2 lần trong cả video**, xen cỡ cảnh (xa, gần, cực cận) và hướng chủ thể (trái, phải, chéo).
| shot | Dùng khi |
| --- | --- |
| `wide` | giới thiệu bối cảnh, thấy con người nhỏ bé trước sự vật |
| `close-up` | nhấn mạnh một vật, nhân vật hay bằng chứng |
| `macro` | một chi tiết nhỏ mang ý nghĩa lớn (dấu mộc, con số, vết nứt) |
| `top-down` | bản đồ, bố trí, dụng cụ trên bàn, quy trình |
| `low-angle` | quyền lực, quy mô, mối đe doạ |
| `diagonal` | chuyển động, xung đột, đà đi lên hoặc đi xuống |
| `left-third` / `right-third` | để chỗ cho nhãn và nhịp nhìn; dùng luân phiên hai bên |
| `split` | so sánh, trước và sau, hai phe |
| `scale-contrast` | chênh lệch kích cỡ (một người cạnh một vật khổng lồ) |
| `frame-in-frame` | tài liệu, ảnh cũ, ký ức, bằng chứng trong khung |
| `cluster` | nhiều mảnh liên quan: danh sách, nhóm người, các nguyên nhân |
Đừng để cả video chỉ dùng chủ thể ở giữa; cũng đổi loại cảnh (bản đồ, tài liệu, biểu đồ, vật thể, ẩn dụ) và vị trí `label` do hệ thống tự xoay.

## Văn phong lời đọc: viết để NGHE, không để đọc
Lời đọc được máy đọc thành tiếng, nên phải giống một người đang kể chuyện, không giống đoạn bách khoa.
- **Nhịp dài ngắn xen kẽ:** sau một câu dài là một câu rất ngắn (2-5 chữ): "Nhưng khoan.", "Chưa hết.", "Và đó là vấn đề." Không để mọi cảnh đều là một câu 18 chữ cùng khuôn chủ ngữ - động từ.
- **Nói với người xem:** dùng "bạn", đặt câu hỏi thật ("Bạn đoán nó sâu bao nhiêu?"), cho họ tự hình dung ("Hãy tưởng tượng…"). Ít nhất 2 câu hỏi và vài lần gọi "bạn" trong cả video.
- **Từ nói hằng ngày, tránh từ sách vở:** bỏ "kinh ngạc", "can đảm", "khủng khiếp", "chấn động", "hiểm nguy" kiểu báo chí. Thay bằng chi tiết: con số, so sánh đời thường ("bằng ba sân bóng"), điều bất ngờ cụ thể.
- **Không mở hai cảnh liền bằng cùng một kiểu** ("Tại đây…", "Sức ép này…", "Bất chấp…"). Mỗi cảnh phải làm một việc cho mạch: đặt câu hỏi, tăng cược, đảo chiều, hoặc trả lời.
- **Show, don't tell:** lời đọc nhắc vật gì thì ảnh chứa vật đó; con số nằm ở `label`. Không đọc lại nguyên văn nhãn.
- Giọng điều tra, tò mò, trung lập; không cảm thán rỗng, không "các bạn ơi".
Ví dụ sửa: ✗ "Bất chấp hiểm nguy, những con tàu lặn đã can đảm chạm tới đáy." → ✓ "Năm 1960, hai người chui vào một quả cầu thép và rơi xuống. Gần bốn tiếng. Rồi họ chạm đáy."

## Độ chính xác (rất quan trọng)
- Chỉ nêu số liệu, tên, mốc thời gian **chắc chắn đúng** (ưu tiên những gì có trong tri thức của kênh). Không chắc thì nói khái quát ("hàng trăm", "đầu những năm 2000") và **không đặt số vào label**. Không bịa nguồn, trích dẫn.
- Phân biệt sự thật đã kiểm chứng với giả thuyết ("các nhà nghiên cứu cho rằng", "theo ước tính").
- Chủ đề nhạy cảm (chính trị, thiên tai, tội phạm, tôn giáo): trung lập, nêu nhiều góc nhìn, không quy kết, không dùng hình ảnh bạo lực hay nạn nhân thật.
- Dữ liệu thay đổi theo thời gian: dùng "tính đến thời điểm quay" thay vì ghi một năm tự giả định.

---

# Phần B. Ngôn ngữ hình ảnh

## Mỗi khung hình gồm các lớp
1. **Nền báo cũ** mờ, chữ in không đọc được (do style tự thêm).
2. **Tấm giấy kẻ ô tối** (xám than, lưới trắng mảnh) làm "bảng" cho thông tin phụ: sơ đồ, radar, biểu đồ.
3. **Chủ thể cắt dán**: viền đỏ thật mảnh, bề mặt in lưới chấm, bóng đổ rõ, có băng keo trong hoặc ghim kim loại giữ ở góc.
4. **Chi tiết chú thích** vẽ tay/vector: mũi tên nét liền hoặc đứt, vòng khoanh, đường chấm, dấu X, số thứ tự, đường biên bản đồ.
5. *(Hệ thống thêm)* nhãn dán chữ, sọc CRT, tối góc, chuyển động máy quay.

(Phong cách ảnh đầy đủ nằm ở `imageStyle` trong phần khai báo: ba lớp tiền cảnh - chủ thể - hậu cảnh, ánh sáng một hướng, góc hơi nghiêng. Sửa nó nếu muốn đổi cả bộ ảnh của kênh.)

## Quy tắc nhất quán cả video
- **Một bộ chất liệu duy nhất:** luôn giấy cắt dán; không trộn ảnh chụp thật, 3D bóng, anime hay tranh sơn dầu.
- **Một màu nhấn chính:** đỏ (viền chủ thể, mũi tên). Chỉ thêm **vàng chanh** cho một điểm nhấn mỗi cảnh (khoanh số, đánh dấu vị trí). Phần còn lại sepia, đen trắng, xám than, kem.
- **Bố cục chừa lề:** chủ thể đặt gần giữa, **chừa khoảng giấy trống ở cả bốn góc** vì nhãn dán sẽ nhảy qua các góc khác nhau giữa các cảnh.
- **Tối đa 1 chủ thể chính + 1-2 chi tiết phụ** mỗi cảnh. Hình càng ít, cảnh càng "Vox".
- **Hình lặp lại tạo mạch:** nhân vật hay vật xuyên suốt (cùng một chiếc máy bay, cùng một thành phố) giữ cùng kiểu vẽ và cùng mô tả đặc điểm ở mọi cảnh có nó.
- **Nhịp thị giác:** xen kẽ cận cảnh vật thể, bản đồ, tài liệu, biểu đồ; không để 3 cảnh liên tiếp cùng loại.

## Thư viện cảnh (chọn loại hợp ý của cảnh)
Mỗi mẫu là phần **tả chủ thể** để điền vào `imagePrompt` (bố cục và cỡ cảnh do `shot` quyết định, đừng tả lại) (tiếng Anh). Thay phần trong ngoặc.

| Loại | Dùng khi | Mẫu imagePrompt | Gợi ý label |
| --- | --- | --- | --- |
| **Vật thể / phương tiện** | giới thiệu đối tượng chính | `a [object] cut out in side view, thin red outline, taped to a dark grid paper panel with a small diagram of [related detail] beside it` | tên riêng, mã hiệu ("BOEING 777") |
| **Bản đồ** | địa điểm, biên giới, hành trình | `a stylized paper-cut map of [region] with the [place] circled in yellow, a dashed red arrow showing [movement], pins at key cities` | tên nơi, khoảng cách |
| **Con người** | nhân vật, nhóm người | `a lone figure in silhouette in front of [setting], three thin arrows pointing at it, pinned photograph frame` (dùng bóng/hình giản lược, không mặt thật) | tên vai trò, năm |
| **Tài liệu / bằng chứng** | trích dẫn, báo cáo, thư, hợp đồng | `a stack of old typed documents with a red stamp area left blank, a magnifying glass resting on top, paperclip` | "BÁO CÁO 1997", tên cơ quan |
| **Biểu đồ / số liệu** | xu hướng, so sánh số | `a simple [bar / line] chart cut from paper with [n] bars, the last one tallest and outlined in red, a bold arrow above it` | con số kèm đơn vị |
| **Dòng thời gian** | trình tự sự kiện | `a horizontal paper timeline strip with [n] taped milestone cards, one card circled in yellow` | năm của mốc chính |
| **So sánh A và B** | đối lập, trước và sau | `two paper cut-outs side by side, [A] on the left and [B] on the right, a bold red "versus" arrow between, divided by a torn paper edge` | "A VS B", tỉ lệ |
| **Cơ chế / quy trình** | giải thích vì sao, như thế nào | `a paper cross-section of [system] with labeled layers, curved red arrows showing the flow, small gears and drops` | tên cơ chế |
| **Địa điểm / toà nhà** | bối cảnh nơi chốn | `a cut-out [building / skyline / landscape] with a red outline, torn paper layers as ground, a thumbtack at the top` | tên địa điểm |
| **Khái niệm trừu tượng** | tiền, quyền lực, rủi ro | `a giant [coin / scale / chain] balancing on a thin string above a small paper town, red outline` | từ khoá khái niệm |
| **Tập thể / đám đông** | nhiều người, nhiều vật | `a repeating row of identical small paper figures, one highlighted with a red outline and a yellow circle` | số lượng |
| **Chuyển cảnh / kết** | nối ý, khép bài | `a single symbolic [object] centered on grid paper with a big empty margin, a small red arrow pointing out of frame` | để trống hoặc câu hỏi mở |

## Công thức imagePrompt
**[chủ thể chính cụ thể] + [chi tiết phụ giúp hiểu] + [bố cục/cỡ cảnh]**, 1-2 câu tiếng Anh, tả cái gì có trong ảnh chứ không tả phong cách (phong cách tự thêm).
- Tốt: *"a Boeing 777 airliner in side view above a radar sweep diagram, one dashed arrow curving away to the right"*.
- Chưa tốt: *"vox style collage of a plane, retro, high contrast, 8k"* (tả phong cách, thiếu chủ thể cụ thể).
- Chưa tốt: *"a crowded airport with many planes, passengers and trucks"* (quá nhiều thứ, không thành mảnh cắt dán).
- **Tránh:** mọi chữ, logo, thương hiệu thật, người nổi tiếng, mặt người thật, bạo lực, cảnh quá đông, chi tiết nhỏ li ti.
- Số lượng chính xác khi cần ("exactly five bars", "three arrows") giúp AI vẽ đúng hơn.

## Nhãn dán (`label`, tối đa 28 ký tự, in hoa)
Là mảnh thông tin quan trọng nhất của cảnh: tên riêng, con số kèm đơn vị, năm, từ khoá. Ví dụ: "BOEING 777", "25 CM MỖI NĂM", "1997", "BƯỚC NGOẶT". Không viết cả câu; không lặp một label ở hai cảnh liền nhau; cảnh chuyển tiếp có thể để trống. Con số không chắc thì không đặt vào nhãn.

## Chuyển động, chiều sâu và kiểu nhãn
Để `motion` và `depth` là `auto`: hệ thống tự đổi chuyển động máy quay, độ nổi của ảnh (tràn khung hoặc tấm giấy nổi trên nền mờ có bụi bay), kiểu nhãn và góc đặt nhãn, nên video không lặp lại. Chỉ chọn cụ thể khi cần:
- `crash-zoom` đập vào mạnh: hook hoặc con số gây sốc, **tối đa 1-2 lần/video**.
- `orbit-left/right` quay vòng quanh chủ thể (vật thể, nhân vật); `tilt-glide` nghiêng lướt (địa điểm, toà nhà); `overhead` nhìn từ trên xuống rồi hạ (bản đồ, tài liệu, bố trí); `slide-parallax` trượt ngang có chiều sâu (dòng thời gian, hành trình).
- `zoom-in` nhấn mạnh bước ngoặt và kết; `zoom-out` hé lộ toàn cảnh; `pan` theo hướng di chuyển; `drift` cho thứ cao hoặc sâu.

## Cảnh phụ: chữ, số, biểu đồ (không cần ảnh AI, rẻ và đổi nhịp)
Xen **1-3 cảnh phụ** để nghỉ mắt và nhấn ý, không biến cả video thành slide:
- `@remotion/counter`: MỘT con số then chốt lăn lên (độ sâu, tuổi, giá). Chỉ dùng số chắc chắn đúng; lời đọc nêu số bằng chữ.
- `@remotion/chart`: so sánh 2-6 số cùng đơn vị, mỗi dòng "Tên: số"; cột lớn nhất tự nổi bật.
- `@remotion/kinetic`: câu cần nhớ (câu hỏi lớn của video, câu chốt trước kết), tối đa 70 ký tự, một từ nhấn. Để `look` là `auto` (đổi kiểu giữa các cảnh). Muốn liệt kê nhiều ý ngắn cùng một câu ("chúng mình lo ___", "dành cho ___") thì điền `items` (mỗi dòng một ý, 2-6 dòng) để hệ thống dùng kiểu xoay ý (viên thuốc đổi từ, cuộn dọc, nhiễu máy...).
Đặt chúng ở chỗ nhịp chuyển (sau hook, ngay trước bước ngoặt, trước kết), không đặt hai cảnh phụ liền nhau.

---

# Ví dụ hoàn chỉnh (8 cảnh, rút gọn; bản thật còn chọn `shot` cho từng cảnh)

Chủ đề: *Tại sao Jakarta đang chìm?* Câu trả lời: *vì người dân rút nước ngầm nhanh hơn tự nhiên bù lại, nên thủ đô phải dời đi.*

1. **Hook** · "Jakarta chìm tới 25 phân mỗi năm. Không phải vì biển dâng, mà vì chính người dân." · label "25 CM MỖI NĂM" · *a paper-cut modern skyline sinking into layers of wavy blue paper, one big red arrow pointing down*
2. **Bối cảnh (bản đồ)** · "Đây là thủ đô của quốc gia đông dân thứ tư thế giới, xây trên vùng đồng bằng thấp ven biển." · label "10 TRIỆU DÂN" · *a stylized paper-cut map of Java with the capital circled in yellow, small pins along the north coast*
3. **Cơ chế** · "Khi nước ngầm cạn, lớp đất phía trên nén lại như miếng bọt biển bị vắt." · label "ĐẤT BỊ NÉN" · *a yellow sponge squeezed by a paper hand above stacked cut-out ground layers, curved arrows pointing inward*
4. **Biểu đồ** · "Mỗi năm, mặt đất ở phía bắc lún nhanh hơn năm trước." · label "TĂNG DẦN" · *a simple bar chart cut from paper with exactly five bars, the last one tallest and outlined in red, a bold arrow above it*
5. **Bước ngoặt (so sánh)** · "Và nước biển chỉ là phần thêm vào: đất lún nhanh hơn mực nước dâng nhiều lần." · label "LÚN > DÂNG" · *two paper arrows side by side, a long red one pointing down and a short blue one pointing up, divided by a torn paper edge*
6. **Tài liệu** · "Chính phủ biết điều đó từ nhiều thập kỷ trước." · label "BÁO CÁO CŨ" · *a stack of old typed documents with a blank red stamp area, a magnifying glass on top, a paperclip*
7. **Địa điểm mới (bản đồ)** · "Cuối cùng Indonesia quyết định dời thủ đô sang đảo khác." · label "DỜI THỦ ĐÔ" · *a paper-cut map of Borneo with a small flag pin, one dashed red arrow coming from the left*
8. **Kết (ẩn dụ)** · "Câu hỏi còn lại: các thành phố khác sẽ làm gì?" · label "" · *a single paper-cut house balancing on a thin string above water, large empty margin around it*

(Ví dụ chỉ minh hoạ cấu trúc và cách viết prompt; khi viết video thật, kiểm lại mọi số liệu.)

---

# Kiểm tra trước khi giao
- Hook nêu được nghịch lý hoặc câu hỏi trong 5 giây đầu? Cảnh kết nhắc lại đúng câu trả lời?
- Mỗi cảnh một ý, một chủ thể chính; không có hai cảnh liền cùng loại hình?
- Mọi số liệu trong lời đọc đều chắc chắn; số nào không chắc đã được nói khái quát và không nằm ở nhãn?
- Mỗi `imagePrompt` chỉ tả chủ thể và bố cục, tiếng Anh, không chữ, không mặt người thật?
- Nhãn ngắn, in hoa, không lặp ở hai cảnh liền; `motion` để `auto`?

# Lỗi thường gặp
- Tả phong cách hoặc bố cục trong imagePrompt → chỉ tả chủ thể; phong cách đã có, bố cục do `shot`.
- Cảnh quá đông chi tiết → một chủ thể và một chi tiết phụ.
- Label là cả câu hay con số không chắc → từ khoá hoặc bỏ trống.
- Cảnh rời rạc, không có mồi nối → thêm câu dẫn sang cảnh sau.
- Hook dài, kết kể lại cả bài → hook vào thẳng nghịch lý, kết chỉ nhắc câu trả lời.
- Lặp `shot` hoặc dùng chủ thể ở giữa mọi cảnh → xoay `shot` theo bảng trên.
