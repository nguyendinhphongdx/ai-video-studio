import { z } from 'zod';

import { FORMATS } from '../domain/catalog';
import type { Episode, PublishKit, Render } from '../domain/episode';
import type { PublishTemplate } from '../domain/series';
import { fillTemplate, type TemplateVars } from '../series/format';

export const PublishKitSchema = z.object({
  youtube: z.object({
    title: z.string().describe('Tiêu đề YouTube hấp dẫn có từ khoá, dưới 70 ký tự'),
    description: z.string().describe('Mô tả 3-5 câu kèm hashtag'),
    tags: z.array(z.string()).describe('8-15 tags'),
  }),
  facebook: z.object({ post: z.string().describe('Bài đăng Facebook thân thiện') }),
  tiktok: z.object({ caption: z.string().describe('Caption TikTok ngắn'), hashtags: z.array(z.string()).describe('Hashtag phổ biến, có dấu #') }),
}) satisfies z.ZodType<PublishKit>;

/** Series template wins over what the AI wrote for the parts it defines. */
export function applyPublishTemplate(kit: PublishKit, template: PublishTemplate | null, vars: TemplateVars): PublishKit {
  if (!template) return kit;
  const tags = (list: string[]) => [...new Set([...list, ...template.hashtags])];
  return {
    youtube: {
      title: template.title ? fillTemplate(template.title, vars) : kit.youtube.title,
      description: [kit.youtube.description, template.descriptionFooter].filter(Boolean).join('\n\n'),
      tags: kit.youtube.tags,
    },
    facebook: kit.facebook,
    tiktok: { caption: kit.tiktok.caption, hashtags: tags(kit.tiktok.hashtags) },
  };
}

export const emptyPublishKit = (): PublishKit => ({ youtube: { title: '', description: '', tags: [] }, facebook: { post: '' }, tiktok: { caption: '', hashtags: [] } });

/** Markdown publish kit, offered as a download next to the videos. */
export function publishMarkdown(episode: Episode, renders: Render[]): string {
  const kit = episode.publish;
  if (!kit) return `# ${episode.title || episode.topic}\n`;
  return `# ${episode.title}

## Video
${renders.map((r) => `- ${r.filePath} (${FORMATS[r.format].label})`).join('\n')}

## YouTube
**Tiêu đề:** ${kit.youtube.title}

**Mô tả:**
${kit.youtube.description}

**Tags:** ${kit.youtube.tags.join(', ')}

## Facebook
${kit.facebook.post}

## TikTok / Reels / Shorts
${kit.tiktok.caption} ${kit.tiktok.hashtags.join(' ')}
`;
}
