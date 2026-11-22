# AI Video Studio

Studio làm video theo kiểu **AI làm, người duyệt** cho nhiều kênh. Mỗi series là một agent có instructions
(bible), bộ nhớ các tập trước, các tool dựng hình và skill (công thức). Bạn duyệt 2 lần: kịch bản và video.

Kiến trúc, quy ước và các điểm mở rộng: [AGENTS.md](AGENTS.md) và [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Cài đặt (1 lần)

1. **Node.js 22.13+**, **FFmpeg** (`brew install ffmpeg` / `winget install ffmpeg`).
2. **Giọng đọc tiếng Việt miễn phí**: `pip install edge-tts` (nếu lệnh `edge-tts` không có trong PATH, đặt `AVS_EDGE_TTS=<đường dẫn>` trong `.env`).
3. `npm install`
4. `npm run dev` rồi mở http://localhost:3300 (chạy cả web lẫn worker).
5. Vào **Cài đặt**, chọn nhà cung cấp AI (Claude, OpenAI, Gemini hoặc OpenAI-compatible), nhập API key, bấm **Kiểm tra kết nối** rồi **Lưu cài đặt**.

Lần chạy đầu tự tạo kênh mẫu **Kid Plazza** từ `seed/channels/`.

## Lệnh

```bash
npm run dev        # web :3300 + worker
npm run typecheck
npm test
npm run studio     # Remotion Studio để xem các khối dựng
```

Dữ liệu chạy (SQLite, file video, API key) nằm trong `data/`, không đưa lên git.

## Bảo mật

Ứng dụng chưa có đăng nhập. Vì vậy `npm run dev` và `npm start` chỉ lắng nghe ở `127.0.0.1` (chỉ máy bạn truy cập được).
Đừng mở cổng ra mạng ngoài hoặc đổi sang `0.0.0.0` khi chưa đặt một lớp xác thực phía trước (reverse proxy có auth, VPN).
API key lưu trong `data/settings.json` (quyền 0600, nằm ngoài git); có thể để trống và dùng biến môi trường trong `.env`.

## Kiểm tra chất lượng

`npm run typecheck` và `npm test` chạy tự động trong CI (`.github/workflows/ci.yml`) cho mỗi push và pull request.
