import type { ContextLayer } from '../layer';

export const episodeLayer: ContextLayer = {
  id: 'episode',
  title: 'Tập cần làm',
  order: 70,
  maxChars: 3000,
  render: ({ episode, neighbours }) =>
    [
      episode.number !== null && `Tập số: ${episode.number}`,
      `Chủ đề: ${episode.topic}`,
      episode.goal && `Mục tiêu: ${episode.goal}`,
      episode.notes && `Ghi chú của người làm: ${episode.notes}`,
      neighbours.previousTopic && `Tập trước: ${neighbours.previousTopic}`,
      neighbours.nextTopic && `Tập sau: ${neighbours.nextTopic}`,
    ]
      .filter(Boolean)
      .join('\n'),
};
