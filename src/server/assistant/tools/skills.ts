import { z } from 'zod';

import { SKILL_GUIDE } from '@/core/assistant/guides';
import { defineTool } from '@/core/assistant/tool';
import { marketService } from '@/server/modules/skill/market.service';
import { skillService } from '@/server/modules/skill/skill.service';
import { toolCatalog } from '@/tools/registry';

import { asJson } from './util';

export const listBlocks = defineTool({
  name: 'list_blocks',
  description: 'Danh sách các công cụ dựng và khối cảnh có thể dùng trong skill, kèm cách dùng và các thuộc tính của từng khối. Đọc trước khi soạn skill.',
  risk: 'read',
  schema: z.object({}),
  summarize: () => 'Xem các công cụ và khối dựng',
  async run() {
    const text = toolCatalog
      .tools()
      .map((t) => `@${t.id}: ${t.summary}\n${t.blocks.map((b) => `  - @${t.id}/${b.id} (${b.name}): ${b.aiGuide} Thuộc tính: ${b.fields.map((f) => f.key).join(', ') || '(không có)'}${b.image ? '. Có ảnh AI: phong cách ảnh lấy từ imageStyle của skill' : ''}`).join('\n')}`)
      .join('\n');
    return { ok: true, message: text };
  },
});

export const listSkills = defineTool({
  name: 'list_skills',
  description: 'Các skill kênh đang có (id, tên, mô tả, công cụ, nguồn). market=true để xem thêm các skill trong market có thể cài (kèm đã cài chưa).',
  risk: 'read',
  schema: z.object({ market: z.boolean().default(false) }),
  summarize: (a) => (a.market ? 'Xem skill của kênh và market' : 'Xem skill của kênh'),
  async run({ market }, ctx) {
    const mine = (await skillService.list(ctx.channelId)).map((s) => ({ id: s.id, name: s.name, description: s.description, tools: s.tools, scenes: `${s.scenes.min}-${s.scenes.max}`, source: s.source }));
    const shop = market ? (await marketService.list(ctx.channelId)).map((m) => ({ id: m.id, name: m.name, description: m.description, tools: m.tools, installedAs: m.installedAs })) : undefined;
    return { ok: true, message: asJson({ skills: mine, market: shop }, 8000) };
  },
});

export const getSkill = defineTool({
  name: 'get_skill',
  description: 'Đọc toàn văn SKILL.md của một skill thuộc kênh.',
  risk: 'read',
  schema: z.object({ skillId: z.string() }),
  summarize: (a) => `Đọc skill ${a.skillId}`,
  async run({ skillId }, ctx) {
    const d = await skillService.get(ctx.channelId, skillId);
    return { ok: true, message: d.markdown };
  },
});

export const installMarketSkill = defineTool({
  name: 'install_market_skill',
  description: 'Cài một skill từ market về kênh (sao chép thành skill riêng của kênh, sau đó sửa tự do). Xem list_skills market=true để biết mã.',
  risk: 'write',
  schema: z.object({ marketId: z.string() }),
  summarize: (a) => `Cài skill “${a.marketId}” từ market về kênh`,
  async run({ marketId }, ctx) {
    const d = await skillService.install(ctx.channelId, marketId);
    return { ok: true, message: `Đã cài về kênh với mã "${d.skill.id}" (${d.skill.name}).` };
  },
});

export const saveSkill = defineTool({
  name: 'save_skill',
  description: `Tạo skill mới hoặc ghi đè skill của kênh bằng toàn bộ nội dung SKILL.md. ${SKILL_GUIDE}`,
  risk: 'write',
  schema: z.object({ skillId: z.string().min(2).max(48), markdown: z.string().min(40).max(100_000), create: z.boolean().default(false) }),
  summarize: (a) => `${a.create ? 'Tạo' : 'Lưu'} skill “${a.skillId}”`,
  async run({ skillId, markdown, create }, ctx) {
    const d = await skillService.save(ctx.channelId, skillId, markdown, { create, source: 'ai' });
    return { ok: true, message: `Đã lưu skill "${d.skill.id}" (${d.skill.name}), ${d.skill.scenes.min}-${d.skill.scenes.max} cảnh. ${d.issues.length ? `Lưu ý: ${d.issues.map((i) => i.message).join('; ')}` : ''}` };
  },
});

export const deleteSkill = defineTool({
  name: 'delete_skill',
  description: 'Xoá một skill khỏi kênh (không xoá được skill đang được video/series dùng hoặc là mặc định).',
  risk: 'destructive',
  schema: z.object({ skillId: z.string() }),
  summarize: (a) => `Xoá skill “${a.skillId}” khỏi kênh`,
  async run({ skillId }, ctx) {
    await skillService.remove(ctx.channelId, skillId);
    return { ok: true, message: `Đã xoá skill "${skillId}".` };
  },
});

export const skillTools = [listBlocks, listSkills, getSkill, installMarketSkill, saveSkill, deleteSkill];
