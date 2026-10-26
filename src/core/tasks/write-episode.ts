import { defineTask } from '../agent/task';
import { STORY_BRIEF } from './story';
import { parseDraft, scriptSchema, type ScriptDraft } from '../script/script';
import type { ToolCatalog } from '../tools/catalog';

export const writeEpisodeTask = (catalog: ToolCatalog) =>
  defineTask<Record<string, never>, ScriptDraft>({
    id: 'write-episode',
    version: 1,
    layers: 'all',
    schema: (_, ctx) => scriptSchema(ctx.slots, catalog),
    prompt: () => `Hãy viết kịch bản hoàn chỉnh cho tập này theo đúng khung tập và schema. Không lặp lại ví dụ đã dùng ở các tập trước.\n\n${STORY_BRIEF}`,
    parse: (raw, _, ctx) => parseDraft(raw, ctx.slots, catalog),
  });
