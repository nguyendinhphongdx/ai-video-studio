# AI Video Studio

Phần mềm làm video theo kiểu **AI làm, người duyệt**, dùng được cho nhiều kênh (mỗi kênh có logo, lời chào, nút đăng ký, khán giả và giọng văn riêng). Bạn gõ 1 dòng ý tưởng, AI viết kịch bản, lồng tiếng tiếng Việt, render video bằng Remotion hoặc HyperFrames, viết sẵn tiêu đề/mô tả/hashtag cho YouTube, Facebook, TikTok. Bạn chỉ bấm **Duyệt** ở 2 chỗ: kịch bản và video.

```
Ý tưởng ──► AI viết kịch bản ──► [BẠN DUYỆT] ──► AI lồng tiếng ──► Render (Remotion / HyperFrames, 16:9 / 9:16) ──► [BẠN DUYỆT] ──► Bộ nội dung đăng bài
                  ▲                    │                                                                                     │
                  └── AI sửa theo góp ý ┘◄────────────────────────── góp ý của bạn ──────────────────────────────────────────┘
```

## Cài đặt (1 lần)

1. Cài **Node.js 22** trở lên: https://nodejs.org
2. Cài **FFmpeg** (cần cho HyperFrames): Windows `winget install ffmpeg`, Mac `brew install ffmpeg`.
3. Cài **giọng đọc tiếng Việt miễn phí** (Edge TTS): cần Python, rồi chạy `pip install edge-tts`.
4. Trong thư mục này chạy:
   ```bash
   npm install
   cp .env.example .env      # Windows: copy .env.example .env
   ```
5. Mở file `.env`, điền `ANTHROPIC_API_KEY` (lấy ở https://console.anthropic.com). Không có key vẫn dùng được, xem "Chế độ dán kịch bản" bên dưới.

## Dùng hằng ngày

```bash
npm start
```
Mở http://localhost:3210

1. Chọn kênh, gõ ý tưởng (VD: "Bé học đếm từ 1 đến 10 với con vật"), chọn mẫu, khung hình (16:9 cho YouTube/Facebook, 9:16 cho TikTok/Reels/Shorts), công cụ render, giọng đọc.
2. Bấm **Tạo kịch bản bằng AI**. Khoảng 30-60 giây sau kịch bản hiện ra.
3. Xem từng cảnh. Muốn sửa thì sửa thẳng trên ô, hoặc gõ yêu cầu cho AI sửa ("thêm 2 cảnh về con mèo"). Xong bấm **Duyệt & sản xuất video**.
4. Chờ render (video 30 giây mất khoảng 1-2 phút mỗi bản). Xem video ngay trên trang.
5. Bấm **Duyệt video**. Phần mềm tạo file `dang-bai.md` có sẵn tiêu đề, mô tả, tags, hashtag cho từng nền tảng. Nếu chưa ưng, gõ góp ý và bấm **Yêu cầu sửa**: AI sửa kịch bản để bạn duyệt lại.

Mọi file nằm trong `projects/<tên-dự-án>/`: `renders/*.mp4`, `audio/` (giọng đọc), `dang-bai.md`, và `hyperframes-*/` (bản HTML có thể chỉnh tay).

### Dòng lệnh (làm hàng loạt)

```bash
npm run make -- "Bé học chữ cái A B C" --brand kid-plazza --template cards --formats landscape,portrait --engines remotion
npm run make -- --spec examples/be-hoc-mau-sac.json --yes     # dùng kịch bản có sẵn, tự duyệt
```

### Chế độ dán kịch bản (không cần API key)

Nếu chưa có `ANTHROPIC_API_KEY`, sau khi tạo dự án bấm **Copy prompt**, dán vào Claude (claude.ai hoặc dự án Claude của bạn), rồi dán JSON Claude trả về vào ô **Dán JSON kịch bản**. Các bước sau giống hệt.

## Thêm kênh mới

Mỗi kênh là 1 thư mục trong `public/brands/`. Kênh mẫu: `public/brands/kid-plazza/`.

1. Copy thư mục `kid-plazza` thành tên mới, ví dụ `public/brands/meo-vat-nau-an/` (chữ thường, không dấu, nối bằng gạch ngang).
2. Thay `logo.png` bằng logo kênh (ảnh vuông).
3. Sửa `brand.json`:
   ```json
   {
     "name": "Tên kênh",
     "audience": "khán giả là ai",
     "style": "giọng văn, cách xưng hô",
     "outroText": "Câu chào cuối video",
     "subscribeText": "🔔 ĐĂNG KÝ KÊNH",
     "hashtags": ["#tenkenh"],
     "voice": "vi-VN-NamMinhNeural"
   }
   ```
AI đọc `audience` và `style` để viết kịch bản đúng giọng kênh. Khởi động lại `npm start` là kênh mới hiện trong ô **Kênh**.

## Mẫu video

| Mẫu | Hợp với | Hình ảnh |
| --- | --- | --- |
| `cards` Thẻ màu sắc | đếm số, chữ cái, màu sắc, con vật, đồ vật | nền màu tươi, chữ lớn nảy, emoji nhún nhảy, logo mở đầu, nút Đăng ký ở cuối |
| `whiteboard` Bảng trắng | vòng đời, quy trình, giải thích | bảng trắng, bút vẽ chữ viết tay, hình hiện dần trong vòng tròn vẽ tay |

Mỗi cảnh dài bằng lời đọc + 0,9 giây (tối thiểu 3,5 giây), nên lời đọc không bao giờ bị cắt.

## Remotion hay HyperFrames?

Cả hai đọc cùng một kịch bản và ra video gần giống nhau.

- **Remotion** (mặc định): ổn định, có hiệu ứng lấp lánh và bút vẽ động. Xem trước/chỉnh mẫu bằng `npm run studio`.
- **HyperFrames**: phần mềm sinh ra một project HTML + GSAP trong `projects/<id>/hyperframes-<khung>/`. Muốn chỉnh tay từng chi tiết: `cd` vào thư mục đó và chạy `npm run dev` để mở HyperFrames Studio, rồi `npm run render`.

## Cấu trúc mã

```
server/spec.mjs               cấu trúc kịch bản (schema) + tính thời lượng từng cảnh
server/ai.mjs                 Claude viết/sửa kịch bản (structured output)
server/brand.mjs              đọc cấu hình kênh trong public/brands/
server/tts.mjs                giọng đọc Edge TTS
server/render-remotion.mjs    render bằng Remotion
server/render-hyperframes.mjs sinh project HyperFrames + render
server/pipeline.mjs           quy trình: ý tưởng → kịch bản → duyệt → sản xuất → duyệt → đăng bài
server/index.mjs              web server + API
ui/index.html                 giao diện duyệt
remotion/Video.tsx            2 mẫu video (thẻ màu, bảng trắng), tự co giãn 16:9 / 9:16
public/                       font, nhạc nền, public/brands/<kênh>/ (logo + brand.json)
examples/                     kịch bản mẫu
```

## Sắp tới (giai đoạn 2)

- Tự đăng lên YouTube / Facebook / TikTok sau khi duyệt.
- Nhân vật riêng của từng kênh thay cho emoji, ảnh minh hoạ do AI vẽ.
- Thêm mẫu: bài hát, truyện kể, câu đố.
- Phụ đề chạy theo lời đọc.
