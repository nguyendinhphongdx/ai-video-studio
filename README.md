# AI Video Studio

Studio làm video theo kiểu **AI làm, người duyệt** cho nhiều kênh. Mỗi series là một agent có instructions
(bible), bộ nhớ các tập trước, các tool dựng hình và skill (công thức). Bạn duyệt 2 lần: kịch bản và video.

Kiến trúc, quy ước và các điểm mở rộng: [AGENTS.md](AGENTS.md) và [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Cài đặt (1 lần)

1. **Node.js 22.13+**, **FFmpeg** (`brew install ffmpeg` / `winget install ffmpeg`).
2. **Giọng đọc tiếng Việt miễn phí**: `pip install edge-tts` (nếu lệnh `edge-tts` không có trong PATH, đặt `AVS_EDGE_TTS=<đường dẫn>` trong `.env`).
3. `npm install`
4. `npm run dev` rồi mở http://localhost:3300 (chạy cả web lẫn worker).
5. **Tạo tài khoản đầu tiên** ở trang đăng ký: tài khoản này là quản trị hệ thống và có workspace "Studio chính".
6. Vào **Cài đặt › Hệ thống**, chọn nhà cung cấp AI (Claude, OpenAI, Gemini hoặc OpenAI-compatible), nhập API key rồi **Lưu**. Đây là khoá chung cho các workspace bạn cho phép.

Lần chạy đầu tự tạo kênh mẫu **Kid Plazza** từ `seed/channels/` trong workspace của quản trị.

**Đưa lên máy chủ** (HTTPS, sao lưu, cập nhật): [docs/DEPLOY.md](docs/DEPLOY.md).

## Lệnh

```bash
npm run dev        # web :3300 + worker
npm run typecheck
npm test
npm run studio     # Remotion Studio để xem các khối dựng
```

Database là Postgres: khi dev chạy `npm run db:dev` (Docker) trước `npm run dev`. File video và API key chung nằm trong `data/`, không đưa lên git. Cài đặt cũ dùng SQLite (`data/app.db`): chạy `npm run db:import-sqlite` một lần để chép sang Postgres.

## Bảo mật

Mọi trang và API đều cần đăng nhập. Dữ liệu thuộc về **workspace**: mỗi người có workspace riêng và mời người khác vào bằng link; người ở workspace này không thấy dữ liệu của workspace khác.
Khoá AI có hai cấp: khoá riêng của workspace (chủ workspace nhập) và khoá chung của hệ thống (quản trị nhập, lưu trong `data/settings.json`, quyền 0600, ngoài git). Workspace chỉ dùng khoá chung khi quản trị cho phép.
Khi mở ra Internet, luôn đặt HTTPS phía trước (bộ Docker trong [docs/DEPLOY.md](docs/DEPLOY.md) có sẵn Caddy).

## Kiểm tra chất lượng

`npm run typecheck` và `npm test` chạy tự động trong CI (`.github/workflows/ci.yml`) cho mỗi push và pull request.
