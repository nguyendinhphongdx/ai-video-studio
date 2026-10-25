// The script contract between the AI and the pipeline. The schema is built from the skill's tools,
// so the AI can only produce scenes that some tool knows how to draw.
import { z } from 'zod';

import type { Channel, PublishKit, Scene } from './domain';
import type { Skill } from './skill';
import { cleanProps, type ToolDefinition } from './tool';

export const PublishKitSchema = z.object({
  youtube: z.object({
    title: z.string().describe('Tiêu đề YouTube hấp dẫn có từ khoá, dưới 70 ký tự'),
    description: z.string().describe('Mô tả 3-5 câu kèm hashtag'),
    tags: z.array(z.string()).describe('8-15 tags'),
  }),
  facebook: z.object({ post: z.string().describe('Bài đăng Facebook thân thiện') }),
  tiktok: z.object({
    caption: z.string().describe('Caption TikTok ngắn'),
    hashtags: z.array(z.string()).describe('Hashtag phổ biến, có dấu #'),
  }),
}) satisfies z.ZodType<PublishKit>;

const NARRATION = 'Lời đọc của cảnh, 1-2 câu, tiếng Việt có dấu, viết số bằng chữ ("ba quả táo")';

export function scriptSchema(tools: ToolDefinition[]) {
  if (!tools.length) throw new Error('Skill không có tool nào hợp lệ');
  const variants = tools.map((t) =>
    z.object({ tool: z.literal(t.id), narration: z.string().describe(NARRATION), props: t.props }),
  );
  const scene = variants.length === 1 ? variants[0]! : z.discriminatedUnion('tool', variants as [typeof variants[0], ...typeof variants]);
  return z.object({
    title: z.string().describe('Tên video, tối đa 40 ký tự'),
    scenes: z.array(scene).describe('Các cảnh theo đúng thứ tự xuất hiện'),
    publish: PublishKitSchema,
  });
}

export type ScriptDraft = { title: string; scenes: Omit<Scene, 'id'>[]; publish: PublishKit };

export function systemPrompt(channel: Channel, skill: Skill, tools: ToolDefinition[]): string {
  return `Bạn là biên kịch video cho kênh "${channel.name}" trên YouTube, Facebook và TikTok.
Khán giả: ${channel.audience}.
Phong cách: ${channel.style}.

## Công thức video (skill "${skill.name}")
${skill.body}

## Công cụ dựng cảnh được phép dùng
Mỗi cảnh chọn đúng 1 công cụ qua trường "tool" và điền "props" theo đúng schema của công cụ đó.
${tools.map((t) => `### @${t.id}: ${t.name}\n${t.aiGuide}`).join('\n\n')}

## Nguyên tắc chung
- Tiếng Việt có dấu, rõ ràng, phù hợp khán giả. Kiến thức phải chính xác.
- An toàn, phù hợp lứa tuổi: không bạo lực, không gây sợ hãi, không quảng cáo trá hình.
- Số cảnh khoảng ${skill.scenes.min}-${skill.scenes.max}, mỗi cảnh truyền đạt đúng 1 ý.
- Phần publish: hashtag luôn có ${channel.hashtags.join(' ') || 'hashtag của kênh'}.`;
}

export function briefPrompt(idea: string, sceneCount: number | null): string {
  return `Ý tưởng video: ${idea}
Số cảnh mong muốn: ${sceneCount ?? 'tự chọn theo công thức'}

Hãy viết kịch bản video hoàn chỉnh theo đúng schema.`;
}

export function revisePrompt(current: ScriptDraft, feedback: string): string {
  return `Đây là kịch bản hiện tại (JSON):
${JSON.stringify(current, null, 2)}

Người duyệt yêu cầu sửa: ${feedback}

Hãy trả lại kịch bản đã sửa theo đúng schema, giữ nguyên những phần không được yêu cầu sửa.`;
}

/** Prompt to paste into Claude by hand when no AI provider is configured. */
export function manualPrompt(system: string, user: string, tools: ToolDefinition[]): string {
  const schema = z.toJSONSchema(scriptSchema(tools));
  return `${system}\n\n${user}\n\nChỉ trả về MỘT khối JSON đúng JSON Schema sau, không giải thích thêm:\n${JSON.stringify(schema)}`;
}

/** Validate an AI (or pasted) script: every scene must use an allowed tool and match its props schema. */
export function validateScript(raw: unknown, tools: ToolDefinition[]): ScriptDraft {
  const draft = scriptSchema(tools).parse(raw);
  return {
    title: draft.title.trim(),
    publish: draft.publish,
    scenes: draft.scenes.map((s) => ({
      tool: s.tool,
      narration: s.narration.trim(),
      props: cleanProps(tools.find((t) => t.id === s.tool)!, s.props),
    })),
  };
}

/** Pull the JSON object out of text that may be wrapped in ``` fences or prose. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Không tìm thấy JSON trong nội dung');
  return JSON.parse(text.slice(start, end + 1));
}
