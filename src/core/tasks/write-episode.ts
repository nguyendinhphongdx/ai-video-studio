import { defineTask } from '../agent/task';
import { renderPlan, type StoryPlan } from './plan-story';
import { STORY_BRIEF } from './story';
import { parseDraft, scriptSchema, type ScriptDraft } from '../script/script';
import type { ToolCatalog } from '../tools/catalog';

export const writeEpisodeTask = (catalog: ToolCatalog) =>
  defineTask<{ plan?: StoryPlan | null }, ScriptDraft>({
    id: 'write-episode',
    version: 2,
    layers: 'all',
    schema: (_, ctx) => scriptSchema(ctx.slots, catalog),
    prompt: ({ plan }) => `Hãy viết kịch bản hoàn chỉnh cho tập này theo đúng khung tập và schema. Không lặp lại ví dụ đã dùng ở các tập trước.${plan ? `\n\nKHUNG MẠCH CHUYỆN đã dựng (bám sát: các cảnh nội dung lần lượt thực hiện từng phần theo đúng thứ tự, mỗi cảnh mở bằng điều phần trước để lại và kết bằng điều phần của nó để lại; nhắc lại sợi chỉ xuyên suốt):\n${renderPlan(plan)}` : ''}\n\n${STORY_BRIEF}`,
    parse: (raw, _, ctx) => parseDraft(raw, ctx.slots, catalog),
  });
