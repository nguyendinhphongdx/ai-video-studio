import { z } from 'zod';

import { defineTask } from '../agent/task';

const BeatSchema = z.object({
  role: z.enum(['hook', 'context', 'rise', 'turn', 'payoff', 'aftertaste']).describe('hook = mở bằng điều khiến người xem muốn biết; context = nền cần có; rise = leo thang; turn = bước ngoặt đảo hiểu biết; payoff = trả lời câu hỏi; aftertaste = hàm ý mang đi'),
  point: z.string().describe('Điều phần này cho người xem biết hoặc thấy (1 câu cụ thể, có chi tiết hoặc số liệu chắc chắn nếu có)'),
  leaves: z.string().describe('Câu hỏi hoặc mâu thuẫn phần này để lại trong đầu người xem và dẫn sang phần sau (phần cuối: điều họ mang đi)'),
});

const PlanSchema = z.object({
  central: z.string().describe('Câu hỏi trung tâm của video, có dấu hỏi, đủ lạ để người xem muốn biết đáp án'),
  answer: z.string().describe('Câu trả lời trong một câu, sẽ chỉ nói ở phần payoff'),
  stakes: z.string().describe('Vì sao người xem nên quan tâm: điều gì bất ngờ hoặc có hệ quả với họ'),
  thread: z.string().describe('Sợi chỉ xuyên suốt: một hình ảnh, nhân vật, con số hoặc phép so sánh cụ thể quay lại ở nhiều phần'),
  beats: z.array(BeatSchema).describe('Các phần theo đúng thứ tự, mỗi phần là một cảnh'),
});

export type StoryPlan = z.infer<typeof PlanSchema>;

export const renderPlan = (p: StoryPlan): string =>
  `Câu hỏi trung tâm: ${p.central}\nCâu trả lời (chỉ nói ở payoff): ${p.answer}\nVì sao đáng xem: ${p.stakes}\nSợi chỉ xuyên suốt: ${p.thread}\nCác phần theo thứ tự:\n${p.beats.map((b, i) => `${i + 1}. [${b.role}] ${b.point}\n   → để lại: ${b.leaves}`).join('\n')}`;

/** Step one of writing a video: the story's spine (question, answer, stakes, thread, beats) before any scene exists. */
export const planStoryTask = defineTask<{ scenes: number; slots: string }, StoryPlan>({
  id: 'plan-story',
  version: 1,
  layers: 'all',
  schema: () => PlanSchema,
  prompt: ({ scenes, slots }) => `Trước khi viết lời đọc, hãy dựng KHUNG MẠCH CHUYỆN cho video này như một biên kịch.

Phần nội dung do AI viết gồm khoảng ${scenes} cảnh${slots ? ` (${slots})` : ''}. Hãy chia câu chuyện thành đúng ${scenes} phần (beats), phần nào cũng nối được sang phần kế.

Một câu chuyện hay có:
- Một câu hỏi trung tâm mà người xem thật sự muốn biết đáp án, và một câu trả lời rõ ràng chỉ được tiết lộ gần cuối.
- Leo thang: mỗi phần cao hơn phần trước (lạ hơn, gần hơn, hệ trọng hơn), không phải danh sách ý ngang hàng.
- Một bước ngoặt đảo hiểu biết ban đầu, ở khoảng 60-70% video.
- Một sợi chỉ xuyên suốt (một hình ảnh, nhân vật hay phép so sánh cụ thể) quay lại ở nhiều phần để các cảnh dính vào nhau.
- Mỗi phần để lại một câu hỏi hoặc mâu thuẫn dẫn sang phần sau (trường "leaves"); phần sau mở bằng chính điều đó.
- Chi tiết cụ thể, chắc chắn đúng (ưu tiên tri thức của kênh), không chung chung.
Không viết lời đọc ở bước này, chỉ dựng khung.`,
  parse: (raw) => PlanSchema.parse(raw),
});
