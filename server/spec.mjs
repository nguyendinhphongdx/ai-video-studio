// Video spec: the single source of truth that the AI writes, the person approves,
// and both renderers (Remotion, HyperFrames) read.
import { z } from "zod";

export const TEMPLATES = {
  cards: "Thẻ màu sắc: chữ lớn + hình (đếm số, chữ cái, danh sách, từ vựng...)",
  whiteboard: "Bảng trắng vẽ tay: giải thích, quy trình, các bước",
};

export const FORMATS = {
  landscape: { width: 1920, height: 1080, label: "16:9 YouTube / Facebook" },
  portrait: { width: 1080, height: 1920, label: "9:16 TikTok / Reels / Shorts" },
};

export const FPS = 30;
export const INTRO_SEC = 3;
export const OUTRO_SEC = 4;
export const MIN_SCENE_SEC = 3.5;
export const SCENE_PAD_SEC = 0.9;

export const SceneSchema = z.object({
  heading: z.string().describe("Chữ lớn trên màn hình, rất ngắn: số, chữ cái hoặc 1-2 từ (tối đa 12 ký tự)"),
  emoji: z.string().describe("Đúng 1 emoji minh hoạ"),
  count: z.number().int().describe("Số lần lặp emoji, 1-10 (dùng cho đếm số; mặc định 1)"),
  caption: z.string().describe("Câu ngắn hiện dưới hình, tối đa 40 ký tự"),
  narration: z.string().describe("Lời đọc cho bé, 1-2 câu, tự nhiên, tiếng Việt có dấu"),
  color: z.string().describe("Màu chủ đạo dạng #RRGGBB, tươi sáng"),
});

export const VideoSpecSchema = z.object({
  title: z.string().describe("Tên video hiện ở đầu, tối đa 30 ký tự"),
  template: z.enum(["cards", "whiteboard"]),
  intro_narration: z.string().describe("Lời chào mở đầu, 1 câu"),
  scenes: z.array(SceneSchema).describe("4-10 cảnh"),
  outro_narration: z.string().describe("Lời kết, nhắc đăng ký kênh"),
  publish: z.object({
    youtube: z.object({ title: z.string(), description: z.string(), tags: z.array(z.string()) }),
    facebook: z.object({ post: z.string() }),
    tiktok: z.object({ caption: z.string(), hashtags: z.array(z.string()) }),
  }),
});

/** Clamp AI output into what the templates can actually draw. */
export function normalizeSpec(spec) {
  const s = VideoSpecSchema.parse(spec);
  s.scenes = s.scenes.slice(0, 12).map((sc) => ({
    ...sc,
    count: Math.min(10, Math.max(1, Math.round(sc.count || 1))),
    color: /^#[0-9a-fA-F]{6}$/.test(sc.color) ? sc.color : "#4FC3F7",
  }));
  return s;
}

/**
 * Timeline in seconds. Each scene lasts as long as its voice-over (plus padding),
 * so narration never gets cut. `audio` maps "intro" | "outro" | scene index -> seconds.
 */
export function buildTimeline(spec, audio = {}) {
  const dur = (key, min) => Math.max(min, (audio[key] ?? 0) + SCENE_PAD_SEC);
  const parts = [];
  let t = 0;
  const push = (kind, key, min, extra = {}) => {
    const d = Math.round(dur(key, min) * FPS) / FPS;
    parts.push({ kind, key: String(key), start: t, duration: d, ...extra });
    t += d;
  };
  push("intro", "intro", INTRO_SEC);
  spec.scenes.forEach((_, i) => push("scene", i, MIN_SCENE_SEC, { index: i }));
  push("outro", "outro", OUTRO_SEC);
  return { parts, total: t };
}

export function narrationLines(spec) {
  return [
    { key: "intro", text: spec.intro_narration },
    ...spec.scenes.map((s, i) => ({ key: String(i), text: s.narration })),
    { key: "outro", text: spec.outro_narration },
  ];
}
