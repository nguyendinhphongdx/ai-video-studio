// AI scriptwriter: idea -> VideoSpec, and spec + feedback -> revised VideoSpec.
import { VideoSpecSchema, TEMPLATES, normalizeSpec } from "./spec.mjs";
import { getLlmSettings, llmReady } from "./settings.mjs";
import { createLlm } from "./llm/index.mjs";

export function systemPrompt(brand) {
  return `Bạn là biên kịch video cho kênh "${brand.name}" trên YouTube, Facebook và TikTok.
Khán giả: ${brand.audience}.
Phong cách: ${brand.style}.

Nguyên tắc nội dung:
- Tiếng Việt có dấu, rõ ràng, phù hợp khán giả.
- Mỗi cảnh truyền đạt đúng 1 ý. Kiến thức phải chính xác.
- An toàn và phù hợp lứa tuổi khán giả: không bạo lực, không gây sợ hãi, không quảng cáo trá hình.
- Lời đọc (narration) dài 1-2 câu, đọc mất khoảng 3-6 giây; viết số bằng chữ trong lời đọc ("ba quả táo").
- heading là chữ thật lớn trên màn hình nên phải rất ngắn (số, chữ cái hoặc 1-2 từ).
- Chọn emoji dễ nhận ra, màu tươi sáng khác nhau giữa các cảnh.
- Với video đếm số, count = đúng con số đang dạy; các video khác count = 1 (hoặc nhỏ để minh hoạ).
- Lời kết nhắc khán giả đăng ký kênh "${brand.name}".

Mẫu video:
${Object.entries(TEMPLATES).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Phần publish: tiêu đề YouTube hấp dẫn có từ khoá (dưới 70 ký tự), mô tả 3-5 câu kèm hashtag, 8-15 tags; bài Facebook thân thiện; caption TikTok ngắn kèm hashtag phổ biến${brand.hashtags.length ? `, luôn có ${brand.hashtags.join(" ")}` : ""}.`;
}

/** True when an AI provider is set up in ⚙️ Cài đặt (or .env); otherwise the UI uses paste mode. */
export async function llmConfigured() {
  return llmReady(await getLlmSettings());
}

export function briefPrompt({ idea, template, sceneCount }) {
  return `Ý tưởng video: ${idea}
Mẫu: ${template}
Số cảnh mong muốn: ${sceneCount || "tự chọn (4-8)"}

Hãy viết kịch bản video hoàn chỉnh theo đúng schema.`;
}

export function revisePrompt(spec, feedback) {
  return `Đây là kịch bản hiện tại (JSON):
${JSON.stringify(spec, null, 2)}

Người duyệt yêu cầu sửa: ${feedback}

Hãy trả lại kịch bản đã sửa theo đúng schema, giữ nguyên những phần không được yêu cầu sửa.`;
}

/** Prompt to paste into Claude (claude.ai / Claude Code) when no AI provider is configured. */
export function manualPrompt(brand, userPrompt) {
  return `${systemPrompt(brand)}

${userPrompt}

Chỉ trả về MỘT khối JSON đúng cấu trúc sau, không giải thích thêm:
{"title": "...", "template": "cards|whiteboard", "intro_narration": "...",
 "scenes": [{"heading": "...", "emoji": "...", "count": 1, "caption": "...", "narration": "...", "color": "#RRGGBB"}],
 "outro_narration": "...",
 "publish": {"youtube": {"title": "...", "description": "...", "tags": ["..."]},
             "facebook": {"post": "..."},
             "tiktok": {"caption": "...", "hashtags": ["..."]}}}`;
}

async function ask(brand, userPrompt) {
  const llm = await getLlmSettings();
  if (!llmReady(llm)) throw new Error("Chưa cài đặt AI. Mở ⚙️ Cài đặt để chọn nhà cung cấp và nhập API key, hoặc dùng chế độ dán kịch bản.");
  const spec = await createLlm(llm).generateSpec({ system: systemPrompt(brand), user: userPrompt, schema: VideoSpecSchema });
  return normalizeSpec(spec);
}

export const writeScript = (brand, brief) => ask(brand, briefPrompt(brief));
export const reviseScript = (brand, spec, feedback) => ask(brand, revisePrompt(spec, feedback));

/** Accept JSON pasted by the person (may be wrapped in ``` fences or prose). */
export function parsePastedSpec(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Không tìm thấy JSON trong nội dung dán vào");
  return normalizeSpec(JSON.parse(text.slice(start, end + 1)));
}
