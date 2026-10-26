import { defineTask } from '../agent/task';
import { STORY_BRIEF } from './story';
import { parseDraft, scriptSchema, type ScriptDraft } from '../script/script';
import type { ToolCatalog } from '../tools/catalog';

export interface ReviseInput {
  current: ScriptDraft;
  feedback: string;
}

export const reviseEpisodeTask = (catalog: ToolCatalog) =>
  defineTask<ReviseInput, ScriptDraft>({
    id: 'revise-episode',
    version: 1,
    layers: 'all',
    schema: (_, ctx) => scriptSchema(ctx.slots, catalog),
    prompt: ({ current, feedback }) => `Đây là kịch bản hiện tại (JSON):
${JSON.stringify(current, null, 2)}

Người duyệt yêu cầu sửa: ${feedback}

Hãy trả lại kịch bản đã sửa theo đúng schema, giữ nguyên những phần không được yêu cầu sửa.

${STORY_BRIEF}`,
    parse: (raw, _, ctx) => parseDraft(raw, ctx.slots, catalog),
  });
