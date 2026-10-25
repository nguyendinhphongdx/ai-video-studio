// AI scriptwriter: idea -> VideoSpec, and spec + feedback -> revised VideoSpec.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { VideoSpecSchema, TEMPLATES, normalizeSpec } from "./spec.mjs";

const MODEL = process.env.AVS_MODEL || "claude-opus-5-5";

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

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
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

/** Prompt to paste into Claude (claude.ai / Claude Code) when no API key is configured. */
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
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: systemPrompt(brand),
    output_config: { effort: "medium", format: zodOutputFormat(VideoSpecSchema) },
    messages: [{ role: "user", content: userPrompt }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error(`AI từ chối yêu cầu: ${response.stop_details?.explanation ?? "không rõ lý do"}`);
  }
  if (!response.parsed_output) throw new Error(`AI không trả về kịch bản hợp lệ (stop_reason=${response.stop_reason})`);
  return normalizeSpec(response.parsed_output);
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
