import { z } from 'zod';

import { defineTask } from '../agent/task';
import type { ScriptDraft } from '../script/script';
import { TALE_BRIEF, VISUAL_BRIEF } from './story';

const OutSchema = z.object({
  issues: z.array(z.object({ scene: z.number().int().describe('Số thứ tự cảnh, 0 nếu là lỗi của cả bài'), problem: z.string(), fix: z.string() })).describe('Chỉ lỗi thật sự phải sửa; để trống nếu kịch bản đạt'),
});

export type ScriptReview = z.infer<typeof OutSchema>['issues'];

/** A second reader before the person: does each picture show what is said, and can a newcomer follow? */
export const reviewScriptTask = defineTask<{ draft: ScriptDraft }, ScriptReview>({
  id: 'review-script',
  version: 1,
  layers: 'all',
  schema: () => OutSchema,
  prompt: ({ draft }) => {
    let n = 0;
    const lines = Object.values(draft.slots).flat().map((s) => `Cảnh ${++n} [${s.block}]\n  Lời: ${s.narration}\n  Hình: ${JSON.stringify(s.props)}`);
    return `Bạn là biên tập viên khó tính. Soát kịch bản dưới đây TRƯỚC khi người duyệt xem, để họ ít phải sửa. Không viết lại, chỉ nêu lỗi.

${lines.join('\n')}

Soát từng cảnh theo các luật sau, cộng với tri thức của kênh (sai sự kiện, sai tên là lỗi):

${TALE_BRIEF}

${VISUAL_BRIEF}

Chỉ nêu lỗi người xem nhận ra được: hình không có điều đang nghe, nhân vật xuất hiện khi chưa được giới thiệu hoặc sai tuổi, hình dạng, nhảy cóc, mâu thuẫn, cùng một người mà tả khác nhau. Không bắt bẻ sở thích văn phong. Tối đa 12 lỗi, nặng nhất trước.`;
  },
  parse: (raw) => OutSchema.parse(raw).issues.slice(0, 12),
});
