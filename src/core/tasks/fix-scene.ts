// "Sửa cảnh này giúp tôi": one AI call over one scene. With no request it makes the picture say what the narration
// says; with a request it changes what was asked (words, who is on stage, where they stand, the picture description).
// It only proposes: nothing is saved or drawn here.
import { z } from 'zod';

import { defineTask } from '../agent/task';
import type { Scene } from '../domain/episode';
import { isEffectId, parseTune, patchTune, TunePatchSchema, TUNE_KEY } from '../domain/tune';
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
  /** Other scene types this part of the format allows. */
  others?: { ref: string; name: string; summary: string }[];
}

export interface SceneFix {
  block: string;
  narration: string;
  props: Record<string, unknown>;
  /** What was changed and why, for the person, in Vietnamese. */
  note: string;
  /** The request needs another kind of scene: the caller asks again with that block. */
  switchTo: string | null;
}

const outSchema = (block: BlockDefinition) =>
  z.object({
    narration: z.string().describe('Lời đọc của cảnh (giữ nguyên văn nếu không được yêu cầu đổi)'),
    props: block.props,
    tune: TunePatchSchema.nullable().describe('Chỉnh tay: bố trí, người và vật thêm, giờ xuất hiện, chữ, âm thanh. Chỉ điền mục yêu cầu cần đổi, còn lại null. Không đổi gì thì cả tune là null.'),
    switchTo: z.string().nullable().describe('Mã loại cảnh khác (trong danh sách được phép) CHỈ KHI loại hiện tại không làm được điều được yêu cầu; nếu không thì null'),
    note: z.string().describe('Một hai câu tiếng Việt: đã đổi gì và vì sao'),
  });

/** Props that name a cast member by id; a name that is not in the cast would break the render. */
const ID_PROPS: Record<string, CastMember['kind'][]> = { lead: ['character'], companion: ['character'], item: ['item'], pose: ['pose'] };

export const fixSceneTask = defineTask<FixSceneInput, SceneFix>({
  id: 'fix-scene',
  version: 2,
  layers: 'all',
  schema: ({ block }) => outSchema(block),
  prompt: ({ block, scene, before, after, cast, request, others = [] }) => {
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

${others.length ? `Loại cảnh khác được phép đổi sang (switchTo):\n${others.map((o) => `- ${o.ref}: ${o.name}. ${o.summary}`).join('\n')}\n\n` : ''}Yêu cầu của người dùng: ${request || 'Viết lại mô tả ảnh và chọn nhân vật, cảm xúc, động tác, kiểu khung sao cho người xem THẤY đúng điều đang được đọc ở cảnh này. Không đổi lời đọc.'}

Cách làm:
- Đọc kỹ lời của cảnh này: ai đang làm gì, ở đâu, lúc nào, cảm xúc gì. Hình phải thể hiện đúng khoảnh khắc đó, không phải cảnh trước hay cảnh sau.
- Mô tả ảnh viết bằng tiếng Anh, cụ thể: chủ thể, hành động, nơi chốn, thời điểm trong ngày, vật quan trọng, bố cục. Không tả phong cách vẽ.
- Chỉ đổi những gì yêu cầu cần; các thuộc tính khác giữ nguyên giá trị.

${VISUAL_BRIEF}`;
  },
  parse: (raw, { block, scene, cast, request, others = [] }) => {
    const out = outSchema(block).parse(raw);
    const props = { ...(out.props as Record<string, unknown>) };
    for (const [key, kinds] of Object.entries(ID_PROPS)) {
      if (typeof props[key] !== 'string' || props[key] === '') continue;
      if (!cast.some((c) => c.id === props[key] && kinds.includes(c.kind))) props[key] = scene.props[key] ?? '';
    }
    // Only people and things that have a picture; their kind comes from the cast, not from the model.
    const extras = out.tune?.extras
      ?.filter((e) => isEffectId(e.id) || cast.some((c) => c.id === e.id && c.kind !== 'pose'))
      .map((e) => ({ ...e, kind: isEffectId(e.id) ? ('fx' as const) : cast.find((c) => c.id === e.id)!.kind === 'item' ? ('item' as const) : ('person' as const) }));
    const old = parseTune(scene.props[TUNE_KEY]) ?? {};
    const tune = out.tune ? patchTune(old, { ...out.tune, extras: extras ?? null }) : parseTune(old);
    const narration = request && out.narration.trim() ? out.narration.trim().slice(0, 600) : scene.narration;
    const switchTo = out.switchTo && out.switchTo !== scene.block && others.some((o) => o.ref === out.switchTo) ? out.switchTo : null;
    return { block: scene.block, narration, props: cleanProps(block, { ...props, ...(tune ? { [TUNE_KEY]: tune } : {}) }), note: out.note.trim(), switchTo };
  },
});
