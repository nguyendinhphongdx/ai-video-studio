import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { QuizSceneProps } from '@video/blocks';

import { HexColor, cleanColor, type Assert, type Same } from './shared';

const props = z.object({
  question: z.string().describe('Câu đố ngắn, tối đa 50 ký tự, ví dụ "Có mấy ngôi sao?"'),
  emoji: z.string().describe('Đúng 1 emoji gợi ý cho câu đố'),
  optionA: z.string().describe('Đáp án A, tối đa 16 ký tự'),
  optionB: z.string().describe('Đáp án B, tối đa 16 ký tự'),
  optionC: z.string().describe('Đáp án C, tối đa 16 ký tự'),
  answer: z.enum(['A', 'B', 'C']).describe('Đáp án đúng; chỉ 1 đáp án đúng, các đáp án còn lại phải sai rõ ràng'),
  color: HexColor,
});
export type _QuizMatchesComponent = Assert<Same<z.infer<typeof props>, QuizSceneProps>>;

const ANSWERS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

export const quizBlock = defineBlock({
  id: 'quiz',
  name: 'Câu đố',
  summary: 'Câu hỏi 3 đáp án, đáp án đúng sáng lên cuối cảnh',
  aiGuide:
    'Một câu đố kiểm tra đúng điều vừa dạy ở tập này. 3 đáp án ngắn, chỉ 1 đúng. Lời đọc đọc câu hỏi và 3 đáp án rồi mời bé đoán ("Một, hai, ba... bé chọn nào?"); không nói đáp án trong lời đọc vì màn hình tự hiện đáp án đúng.',
  props,
  fields: [
    { key: 'question', label: 'Câu hỏi', kind: 'text', maxLength: 60 },
    { key: 'emoji', label: 'Emoji gợi ý', kind: 'emoji' },
    { key: 'optionA', label: 'Đáp án A', kind: 'text', maxLength: 20 },
    { key: 'optionB', label: 'Đáp án B', kind: 'text', maxLength: 20 },
    { key: 'optionC', label: 'Đáp án C', kind: 'text', maxLength: 20 },
    { key: 'answer', label: 'Đáp án đúng', kind: 'choice', options: ANSWERS },
    { key: 'color', label: 'Màu nền', kind: 'color' },
  ],
  defaults: { question: 'Có mấy ngôi sao?', emoji: '⭐', optionA: '2', optionB: '3', optionC: '5', answer: 'B', color: '#FF8A65' },
  minSeconds: 6,
  normalize: (p) => ({ ...p, color: cleanColor(p.color, '#FF8A65') }),
});
