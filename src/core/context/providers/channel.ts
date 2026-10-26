import type { ContextLayer } from '../layer';

export const channelLayer: ContextLayer = {
  id: 'channel',
  title: 'Kênh',
  order: 10,
  maxChars: 1500,
  render: ({ channel }) => `Tên kênh: ${channel.name}
${channel.description ? `Kênh nói về: ${channel.description}\n` : ''}Khán giả: ${channel.audience}
Giọng văn: ${channel.style}
Hashtag của kênh: ${channel.hashtags.join(' ') || '(chưa có)'}`,
};
