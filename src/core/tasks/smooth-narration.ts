import { z } from 'zod';

import { defineTask } from '../agent/task';
import { renderPlan, type StoryPlan } from './plan-story';

const OutSchema = z.object({ lines: z.array(z.string()).describe('Lời đọc đã viết lại, đúng số dòng và đúng thứ tự như bản gốc') });

/** Last step of writing a video: read the narration as one voice-over and make the cuts between scenes disappear. */
export const smoothNarrationTask = defineTask<{ plan: StoryPlan | null; lines: string[] }, string[]>({
  id: 'smooth-narration',
  version: 1,
  layers: ['system', 'channel', 'knowledge', 'instructions', 'skill'],
  schema: () => OutSchema,
  prompt: ({ plan, lines }) => `Dưới đây là lời đọc của từng cảnh trong một video, theo thứ tự. Hãy đọc liền từ đầu đến cuối như MỘT bài kể và biên tập lại để nghe là một câu chuyện liền mạch, không phải các ý rời nhau.

${plan ? `Khung mạch chuyện (để giữ đúng hướng):\n${renderPlan(plan)}\n\n` : ''}Lời đọc hiện tại:
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Yêu cầu:
- Giữ đúng số dòng (${lines.length}) và đúng thứ tự; dòng i vẫn là lời đọc của cảnh i.
- Giữ nguyên MỌI sự kiện, số liệu, tên riêng; không thêm dữ kiện mới, không bỏ ý chính của cảnh.
- Câu đầu mỗi cảnh phải tiếp nối câu cuối cảnh trước (nhắc lại, trả lời hoặc đảo ý), nghe như một người đang kể liền, không như bắt đầu lại.
- Câu cuối mỗi cảnh để lại một mồi dẫn sang cảnh sau (trừ cảnh cuối: chốt câu trả lời và để lại một hàm ý).
- Nhắc lại sợi chỉ xuyên suốt ở vài cảnh để các cảnh dính vào nhau.
- Viết để NGHE: xen câu dài với câu rất ngắn, gọi "bạn", có vài câu hỏi, từ nói hằng ngày, bỏ từ sách vở sáo rỗng; không hai cảnh liền mở giống nhau.
- Mỗi cảnh 1-3 câu, viết số bằng chữ. Chỉ trả về JSON.`,
  parse: (raw, { lines }) => {
    const out = OutSchema.parse(raw).lines.map((l) => l.trim());
    if (out.length !== lines.length || out.some((l) => !l)) throw new Error(`Số dòng lời đọc không khớp (${out.length}/${lines.length})`);
    return out;
  },
});
