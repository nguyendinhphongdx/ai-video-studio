# Kế hoạch: nhân vật nhất quán và chuyển động

Nguồn ý tưởng: video chibi cổ phong mà người dùng muốn đạt tới, và `kaomei/stickman-video-director` (MIT; chỉ mượn thiết kế, xem `NOTICE`).

## Giai đoạn 1: nhất quán (đã code, chờ chạy thử thật)
- `ImagePort.generate(..., refs)` gửi ảnh tham chiếu (Gemini `inlineData`, OpenAI `images.edit`).
- Series có `bible.characterAssets` (ảnh chuẩn) và `bible.characters` (mô tả chữ). Chuỗi phong cách của kênh được nối thêm quy tắc "giữ đúng nhân vật", nên đổi ảnh chuẩn thì hash ảnh đổi và cảnh cần tạo lại.
- Skill `chibi-guofeng`: phong cách chibi nét viền đậm, nền tranh cổ phong.

## Giai đoạn 2: nhân vật chuyển động (đã code bước đầu)
Mô hình: nhân vật là **bộ ảnh toàn thân nền trong suốt theo biểu cảm** (`neutral`, `talk`, `blink`, `happy`, `angry`, `sad`, `surprised`), lưu ở `bible.characterSprites`. Chưa tách tay, đầu thành lớp riêng.
- `remotion/puppet/rig.ts`: hàm thuần theo thời gian: đi vào/ra, đi ngang, nhảy, vẫy tay, thở, nảy khi nói, nháy mắt, miệng nói, chọn sprite theo biểu cảm, keyframe `t,x,y,scale,angle,alpha` nội suy mượt.
- Block `@remotion/puppet` (`src/tools/remotion/blocks/puppet.ts`, `remotion/blocks/puppet.tsx`): props `emotion`, `action`, `side`, `caption`, `imagePrompt` (chỉ tả phông nền trống).
- Ảnh phông nền của block này không gửi ảnh nhân vật (`image.background`).
- Bước render nhét sprite vào props của cảnh puppet. Đổi sprite thì bước render chạy lại.
- UI: mục "Nhân vật diễn" trong Bảng nhân vật.
- Skill `chibi-guofeng` hướng dẫn AI dùng puppet cho cảnh có nhân vật và picture cho cảnh khác.

### Chưa làm trong giai đoạn 2
1. Bản xem trước trong Storyboard (trình phát trong trình duyệt) chưa nhận sprite, cảnh puppet hiện khung "Chưa có ảnh nhân vật" ở đó. Cần truyền `bible.characterSprites` vào `storyboardProps` (`features/episode/lib/preview.ts`) bằng URL `/api/v1/media/...`.
2. Miệng theo âm lượng thật thay cho mẫu giả ngẫu nhiên (`@remotion/media-utils` hoặc Rhubarb Lip Sync).
3. ~~Tạo bộ sprite từ ảnh chuẩn bằng AI~~ (đã code, chờ chạy thật, xem mục dưới).
4. Nhiều nhân vật trong một cảnh và hội thoại qua lại.
5. Tách tay/đầu thành lớp (rig) cho nhân vật chính.

### Sinh bộ biểu cảm từ ảnh chuẩn (đã code, chưa chạy với API thật)
- Nút "Sinh bộ biểu cảm từ ảnh chuẩn" trong mục "Nhân vật diễn" của Bảng nhân vật: tạo các biểu cảm còn thiếu từ ảnh chuẩn đầu tiên; phí một ảnh AI cho mỗi biểu cảm.
- Luồng: `POST /api/v1/series/characters/sprites` (xếp job `generate_sprites`) → worker (`character-sprites.service.ts`) gọi `images.generate` cho từng biểu cảm (neutral trước, các biểu cảm sau gửi kèm ảnh chuẩn và sprite neutral) trên nền xanh lá phẳng → `chroma-key.ts` tách nền bằng flood fill từ biên (giữ pixel xanh ở trong thân), làm mềm viền, bỏ ánh xanh, đặt chân sát đáy trên canvas 700×1100 trong suốt, cùng tỉ lệ với neutral → kết quả `{ sprites }` đọc ở `GET /jobs/:id`, giao diện nhập vào bảng, người dùng bấm Lưu.
- Lựa chọn thận trọng: tỉ lệ lấy theo sprite neutral để đầu không nhảy giữa các biểu cảm; nhân vật có màu xanh lá sẽ bị tách sai (prompt đã dặn không dùng xanh lá trên nhân vật).
- Test dùng ImagePort giả và ảnh nền xanh tổng hợp; chưa kiểm bằng ảnh thật của model.

## Bộ phong cách (market/skills, 12 skill theo bản tham khảo, viết lại bằng lời của mình)
Mỗi skill có `imageStyle` tiếng Anh, hướng dẫn tiếng Việt, mục "Cảnh có nhân vật diễn" và mục "Chưa có trong ứng dụng". Cần chung cho cả 12: nhân vật diễn là sprite cả người (chưa có tay chân IK, cầm đồ, nhiều nhân vật một cảnh), khung ngang 16:9.

| Skill | Tạm gọi | Còn thiếu để đạt đúng bản gốc |
|---|---|---|
| classic-minimalist | A1 tối giản đen trắng | tay chân IK |
| modern-studio-tech | A2 studio công nghệ | lớp giao diện kính động theo lời đọc |
| prehistoric-dark-comedy | A3 tiền sử hài đen | hai nhân vật cùng khung (hội thoại) |
| cozy-storytelling | A4 kể chuyện ấm cúng | chuyển cảnh theo đồ vật nối |
| historical-cartoon | A5 hoạt hình lịch sử | màn nhập "gói thời đại", kiểm tra sự thật |
| amber-noir | A6 noir hổ phách | phụ đề tô từng từ (karaoke), lớp tiêu đề riêng |
| b1-minimal-handdrawn | B1 nét tối giản | hoạt hình cục bộ, hiện từng phần tử, vẽ dần nét |
| b2-colorful-handdrawn | B2 vẽ tay nhiều màu | font viết tay riêng |
| b3-retro-tv | B3 truyền hình cũ | hiệu ứng analog hậu kỳ, mũi tên động |
| b4-survival-thriller | B4 sinh tồn | cổng chất lượng "không quá 3 giây không đổi hình", chữ mở đầu riêng |
| b5-character-explainer | B5 người dẫn | IK cho người dẫn và người que, hai sân khấu một cảnh |
| b6-dynamic-meme | B6 meme động | xuất khung dọc 9:16, tay một nét chuyển động |

Bản tham khảo chính thức có 12 phong cách (A1-A6, B1-B6); không có A7, A8, B7. Sắp tới còn cần thêm hai việc dùng chung: kiểm bằng ảnh thật 3 cảnh liền nhau, và xuất 9:16.

## Giai đoạn 3: xem thử, chất lượng, xuất bản (mượn từ stickman-video-director)
1. **Xem thử đoạn ngắn có tiếng** (~20 giây) và duyệt trước khi render đủ: tái dùng `renderStep` cho một dải cảnh đầu, ghi bản duyệt theo hash nội dung.
2. **Phụ đề khớp từng từ** nếu chưa có (Whisper hoặc căn thời gian từ TTS).
3. **Cổng chất lượng**: không để quá 2,5 giây không có chuyển động chính; kiểm tra phụ đề một dòng. Thêm vào `src/core/quality/checks`.
4. **Âm thanh**: ambience theo cảnh, mở rộng `src/core/audio/sfx.ts`.
5. **Bộ xuất bản**: 5 tiêu đề, mô tả, tag, câu hỏi ghim (`src/core/script/publish.ts`).
6. **Xuất 9:16** (cần kiểm tra bố cục của các block).

## Không làm
Chế độ "Model Engine" (viết prompt cho clip video ngoài): cần credit video model bên ngoài, không hợp luồng của app.

## Kiểm chứng cần có trước khi dựa vào
- Chạy `npm test` trên máy macOS của người dùng (vitest không chạy được trong môi trường làm việc từ xa).
- Sinh thử 3 cảnh liền nhau để xem nhân vật có giữ nguyên không (cần API key ảnh).
- Dựng thử một cảnh puppet bằng `npm run studio` hoặc một job render để xem chuyển động thật.
