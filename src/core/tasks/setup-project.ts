import { z } from 'zod';

import { defineTask } from '../agent/task';
import { VOICE_IDS, VOICES, type VoiceId } from '../domain/catalog';

export interface SetupSkill {
  id: string;
  name: string;
  description: string;
}

const Cast = z.object({
  id: z.string().describe('Id ngắn không dấu, chữ thường và gạch nối, ví dụ "ly-tinh"'),
  kind: z.enum(['hero', 'character', 'item']).describe('hero = nhân vật chính (đúng một), character = nhân vật phụ, item = đạo cụ hay bảo vật'),
  name: z.string().describe('Tên tiếng Việt'),
  description: z.string().describe('Tiếng Anh: tuổi, gương mặt, tóc, trang phục, màu sắc, đủ chi tiết để vẽ giống nhau mọi lần'),
});

const SetupSchema = z.object({
  name: z.string().describe('Tên dự án/kênh, tối đa 50 ký tự'),
  description: z.string().describe('1-2 câu giới thiệu dự án'),
  audience: z.string().describe('Khán giả là ai'),
  style: z.string().describe('Giọng văn của lời đọc'),
  voice: z.string().describe('Id giọng đọc, chọn trong danh sách'),
  imageStyle: z.string().describe('Tiếng Anh, phong cách hình vẽ: chất liệu, nét, màu, ánh sáng; tối đa 400 ký tự'),
  palette: z.array(z.string()).describe('3 màu chủ đạo dạng #RRGGBB'),
  outroText: z.string().describe('Câu chào cuối video, tối đa 60 ký tự'),
  hashtags: z.array(z.string()).describe('3-6 hashtag, mỗi cái bắt đầu bằng #'),
  knowledge: z.string().describe('Tri thức nền của dự án bằng Markdown tiếng Việt: bối cảnh, cốt truyện hay kiến thức gốc theo thứ tự, nhân vật và quan hệ, chi tiết nhiều dị bản, điều cần tránh nói sai'),
  skillId: z.string().describe('Id skill phù hợp nhất trong danh sách'),
  series: z.object({
    name: z.string().describe('Tên series đầu tiên'),
    premise: z.string(),
    instructions: z.string().describe('Cách kể xuyên suốt series (giọng, điều giữ nguyên giữa các tập)'),
    avoid: z.array(z.string()).describe('Điều tuyệt đối tránh'),
    cast: z.array(Cast).describe('Thư viện hình cần có: 1 hero, các nhân vật phụ xuất hiện nhiều, đạo cụ quan trọng; tối đa 10'),
    roadmap: z.array(z.object({ topic: z.string(), goal: z.string() })).describe('4-8 tập theo thứ tự'),
  }),
  logoPrompt: z.string().describe('Tiếng Anh: mô tả logo kênh, đơn giản, không chữ'),
  introArtPrompt: z.string().describe('Tiếng Anh: tranh nền intro đặc trưng của kênh, không người, không chữ'),
});

export type ProjectSetup = Omit<z.infer<typeof SetupSchema>, 'voice'> & { voice: VoiceId };

export const slugId = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

const clip = (value: string, max: number) => value.trim().slice(0, max);

/** What a proposal still lacks to be usable without the person filling it in. */
export function setupProblems(p: ProjectSetup): string[] {
  const out: string[] = [];
  if (!p.series.cast.some((c) => c.kind === 'hero')) out.push('Thư viện chưa có nhân vật chính (kind hero).');
  if (p.series.cast.filter((c) => c.kind !== 'hero').length < 2) out.push('Thư viện cần ít nhất 2 nhân vật phụ hoặc đạo cụ xuất hiện nhiều.');
  const short = p.series.cast.filter((c) => c.description.split(/\s+/).length < 10 || /[ăâđêôơưĂÂĐÊÔƠƯ]/.test(c.description));
  if (short.length) out.push(`Mô tả vẽ phải bằng tiếng Anh, đủ tuổi, tóc, trang phục, màu (ít nhất 10 từ): ${short.map((c) => c.name).join(', ')}.`);
  if (p.series.roadmap.length < 4) out.push('Lộ trình cần ít nhất 4 tập.');
  if (p.knowledge.trim().length < 600) out.push('Tri thức quá sơ sài: viết đủ bối cảnh, cốt truyện hay kiến thức gốc theo thứ tự, nhân vật và quan hệ.');
  if (!p.imageStyle.trim()) out.push('Thiếu phong cách hình vẽ.');
  if (!p.series.instructions.trim()) out.push('Thiếu cách kể của series.');
  if (!p.logoPrompt.trim() || !p.introArtPrompt.trim()) out.push('Thiếu gợi ý logo hoặc tranh intro.');
  return out;
}

/** One idea in, a whole project proposal out. Nothing is saved or drawn: the person reviews it first. */
export const setupProjectTask = defineTask<{ idea: string; skills: SetupSkill[]; fix?: { draft: ProjectSetup; problems: string[] } }, ProjectSetup>({
  id: 'setup-project',
  version: 1,
  layers: [],
  schema: () => SetupSchema,
  prompt: ({ idea, skills, fix }) => `Một người muốn lập dự án video mới. Ý tưởng của họ: "${idea}"

Hãy đề xuất TRỌN BỘ thiết lập dự án để họ duyệt, viết tiếng Việt trừ các trường ghi rõ tiếng Anh. Cụ thể và dùng được ngay, không chung chung. Với truyện có gốc (cổ tích, thần thoại, lịch sử) thì tri thức phải đúng gốc, chỗ không chắc nói rõ.

Giọng đọc (id: mô tả):
${Object.entries(VOICES).map(([id, label]) => `- ${id}: ${label}`).join('\n')}

Skill có sẵn (id: tên, dùng khi nào):
${skills.map((s) => `- ${s.id}: ${s.name}. ${s.description}`).join('\n')}${fix ? `\n\nBản đề xuất trước còn thiếu, hãy giữ phần đã tốt và sửa:\n- ${fix.problems.join('\n- ')}\nBản trước (JSON): ${JSON.stringify(fix.draft)}` : ''}`,
  parse: (raw, { skills }) => {
    const p = SetupSchema.parse(raw);
    const seen = new Set<string>();
    let hero = false;
    const cast = p.series.cast
      .map((c) => ({ ...c, id: slugId(c.id || c.name), name: clip(c.name, 60), description: clip(c.description, 400) }))
      .filter((c) => c.id && c.description && !seen.has(c.id) && Boolean(seen.add(c.id)))
      .slice(0, 10)
      .map((c) => {
        if (c.kind !== 'hero') return c;
        const first = !hero;
        hero = true;
        return first ? c : { ...c, kind: 'character' as const };
      });
    const palette = p.palette.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 6);
    return {
      ...p,
      name: clip(p.name, 60),
      description: clip(p.description, 500),
      audience: clip(p.audience, 300),
      style: clip(p.style, 500),
      voice: (VOICE_IDS as string[]).includes(p.voice) ? (p.voice as VoiceId) : VOICE_IDS[0]!,
      imageStyle: clip(p.imageStyle, 500),
      palette: palette.length ? palette : ['#4F46E5', '#FFC53D', '#FF5C8A'],
      outroText: clip(p.outroText, 80),
      hashtags: p.hashtags.map((h) => `#${h.replace(/[#\s]/g, '')}`).filter((h) => h.length > 1).slice(0, 10),
      skillId: skills.some((s) => s.id === p.skillId) ? p.skillId : skills[0]!.id,
      series: {
        name: clip(p.series.name, 80),
        premise: clip(p.series.premise, 1000),
        instructions: clip(p.series.instructions, 4000),
        avoid: p.series.avoid.map((a) => clip(a, 200)).filter(Boolean).slice(0, 30),
        cast,
        roadmap: p.series.roadmap.map((r) => ({ topic: clip(r.topic, 300), goal: clip(r.goal, 300) })).filter((r) => r.topic.length >= 3).slice(0, 12),
      },
      logoPrompt: clip(p.logoPrompt, 400),
      introArtPrompt: clip(p.introArtPrompt, 400),
    };
  },
});
