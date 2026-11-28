import type { ChannelInput } from '@/features/channel/services/channel.api';

export const SECTIONS = [
  { key: 'general', label: 'Chung', hint: 'Tên, mô tả, khán giả, giọng văn' },
  { key: 'brand', label: 'Thương hiệu', hint: 'Logo, màu, phong cách hình, intro và outro' },
  { key: 'voice', label: 'Giọng đọc', hint: 'Nghe thử và chọn giọng, lời kết video' },
  { key: 'knowledge', label: 'Tri thức', hint: 'Sự thật và quy tắc AI phải bám theo' },
  { key: 'cost', label: 'Chi phí', hint: 'Đã tốn bao nhiêu, vào việc gì, ngân sách' },
] as const;
export type SectionKey = (typeof SECTIONS)[number]['key'];

/** The channel fields each form section owns: saving a section writes only these and leaves the rest as saved. */
export const FIELDS: Partial<Record<SectionKey, (keyof ChannelInput)[]>> = {
  general: ['name', 'description', 'audience', 'style', 'hashtags'],
  brand: ['font', 'palette', 'imageStyle', 'music', 'introDesign', 'outroDesign'],
  voice: ['voice', 'outroText', 'subscribeText'],
};

export interface FormProps {
  form: ChannelInput;
  set: <K extends keyof ChannelInput>(k: K, v: ChannelInput[K]) => void;
}
