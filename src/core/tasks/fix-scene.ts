// "Sửa cảnh này giúp tôi": one AI call over one scene. With no request it makes the picture say what the narration
// says; with a request it changes what was asked (words, who is on stage, where they stand, the picture description).
// It only proposes: nothing is saved or drawn here.
import { z } from 'zod';

import { defineTask } from '../agent/task';
import type { Scene } from '../domain/episode';
import { newExtra, parseTune, TUNE_KEY } from '../domain/tune';
import { cleanProps, type BlockDefinition } from '../tools/tool';
import { VISUAL_BRIEF } from './story';

export interface CastMember {
  id: string;
  kind: 'hero' | 'character' | 'item' | 'pose';
  about: string;
}

export interface FixSceneInput {
  block: BlockDefinition;
  scene: Scene;
  before: string | null;
  after: string | null;
  cast: CastMember[];
  /** What the person wants changed; empty = rewrite the picture to fit the narration. */
  request: string;
}

export interface SceneFix {
  narration: string;
  props: Record<string, unknown>;
  /** What was changed and why, for the person, in Vietnamese. */
  note: string;
}

const place = z.object({ dx: z.number(), dy: z.number(), scale: z.number() }).nullable();

const outSchema = (block: BlockDefinition) =>
  z.object({
    narration: z.string().describe('Lời đọc của cảnh (giữ nguyên văn nếu không được yêu cầu đổi)'),
    props: block.props,
    layout: z.object({ hero: place, companion: place, item: place }).nullable().describe('Chỉ khi được yêu cầu dời hay phóng to/thu nhỏ nhân vật trên phông: dx, dy là phần của khung hình (phải và xuống là dương), scale 1 là cỡ chuẩn. Không đổi bố trí thì để null.'),
    extras: z.array(z.object({ id: z.string(), x: z.number(), scale: z.number() })).nullable().describe('Khi cảnh cần nhiều người hoặc vật hơn các ô lead/companion/item: danh sách ĐẦY ĐỦ những người, vật thêm vào (id trong dàn đã có ảnh; x là vị trí ngang 0 trái đến 1 phải; scale 1 là cỡ chuẩn). Không cần đổi thì null.'),
    note: z.string().describe('Một hai câu tiếng Việt: đã đổi gì và vì sao'),
  });

/** Props that name a cast member by id; a name that is not in the cast would break the render. */
const ID_PROPS: Record<string, CastMember['kind'][]> = { lead: ['character'], companion: ['character'], item: ['item'], pose: ['pose'] };

export const fixSceneTask = defineTask<FixSceneInput, SceneFix>({
  id: 'fix-scene',
  version: 1,
  layers: 'all',
  schema: ({ block }) => outSchema(block),
  prompt: ({ block, scene, before, after, cast, request }) => {
    const { [TUNE_KEY]: tune, ...props } = scene.props;
    const fields = block.fields.map((f) => `- ${f.key} (${f.label})${f.options ? `: ${f.options.map((o) => `${o.value}=${o.label}`).join(', ')}` : ''}${f.hint ? `. ${f.hint}` : ''}`);
    return `Sửa MỘT cảnh của video. Loại cảnh: ${block.name} (${block.summary}).

Cảnh trước đọc: ${before ?? '(không có)'}
CẢNH NÀY đọc: ${scene.narration || '(không có lời)'}
Cảnh sau đọc: ${after ?? '(không có)'}

Thuộc tính hiện tại: ${JSON.stringify(props)}
${tune ? `Bố trí chỉnh tay hiện tại: ${JSON.stringify(tune)}\n` : ''}
Ý nghĩa các thuộc tính:
${fields.join('\n')}

${cast.length ? `Nhân vật, vật phẩm, tư thế đã có ảnh (chỉ dùng đúng các id này):\n${cast.map((c) => `- ${c.id} (${c.kind}): ${c.about}`).join('\n')}` : 'Không có dàn nhân vật vẽ sẵn: các ô id để chuỗi rỗng.'}

Yêu cầu của người dùng: ${request || 'Viết lại mô tả ảnh và chọn nhân vật, cảm xúc, động tác, kiểu khung sao cho người xem THẤY đúng điều đang được đọc ở cảnh này. Không đổi lời đọc.'}

Cách làm:
- Đọc kỹ lời của cảnh này: ai đang làm gì, ở đâu, lúc nào, cảm xúc gì. Hình phải thể hiện đúng khoảnh khắc đó, không phải cảnh trước hay cảnh sau.
- Mô tả ảnh viết bằng tiếng Anh, cụ thể: chủ thể, hành động, nơi chốn, thời điểm trong ngày, vật quan trọng, bố cục. Không tả phong cách vẽ.
- Chỉ đổi những gì yêu cầu cần; các thuộc tính khác giữ nguyên giá trị.

${VISUAL_BRIEF}`;
  },
  parse: (raw, { block, scene, cast, request }) => {
    const out = outSchema(block).parse(raw);
    const props = { ...(out.props as Record<string, unknown>) };
    for (const [key, kinds] of Object.entries(ID_PROPS)) {
      if (typeof props[key] !== 'string' || props[key] === '') continue;
      if (!cast.some((c) => c.id === props[key] && kinds.includes(c.kind))) props[key] = scene.props[key] ?? '';
    }
    // Only people and things that have a picture; their kind comes from the cast, not from the model.
    const extras = out.extras
      ?.filter((e) => cast.some((c) => c.id === e.id && c.kind !== 'pose'))
      .map((e) => {
        const kind = cast.find((c) => c.id === e.id)!.kind === 'item' ? ('item' as const) : ('person' as const);
        return { ...newExtra(e.id, kind, []), x: e.x, scale: e.scale };
      });
    const tune = parseTune({ ...(parseTune(scene.props[TUNE_KEY]) ?? {}), ...(extras ? { extras } : {}), ...Object.fromEntries(Object.entries(out.layout ?? {}).filter(([, v]) => v)) });
    const narration = request && out.narration.trim() ? out.narration.trim().slice(0, 600) : scene.narration;
    return { narration, props: cleanProps(block, { ...props, ...(tune ? { [TUNE_KEY]: tune } : {}) }), note: out.note.trim() };
  },
});
