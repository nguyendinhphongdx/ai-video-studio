import type { ContextLayer } from '../layer';

/** The channel's own knowledge base: facts, rules and sources the AI must rely on instead of guessing. */
export const knowledgeLayer: ContextLayer = {
  id: 'knowledge',
  title: 'Tri thức của kênh',
  order: 15,
  maxChars: 16000,
  render: ({ knowledge }) =>
    knowledge?.markdown.trim()
      ? `Đây là tri thức riêng của kênh (phiên bản ${knowledge.version}). Hãy dựa vào đây khi viết nội dung; không bịa thêm sự kiện, số liệu hay nguồn ngoài những gì có ở đây hoặc bạn chắc chắn đúng.\n\n${knowledge.markdown.trim()}`
      : null,
};
