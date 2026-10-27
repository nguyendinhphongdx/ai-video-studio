// What the AI may use for a channel's videos: the scene types its skills allow, and how many looks it rotates through.
import { templateCatalog, type BlockLike, type TemplateGroup } from '@/features/templates/lib/catalog';

export interface ToolRef {
  id: string;
  blocks: BlockLike[];
}
export interface SkillRefs {
  id: string;
  name: string;
  tools: string[];
  update: unknown;
}

export interface Toolkit {
  /** Scene types any of the skills can use (outro and similar fixed scenes included), by name. */
  blocks: { ref: string; name: string; skills: string[] }[];
  /** Scene types the studio has that no skill of the channel allows. */
  unused: { ref: string; name: string }[];
  /** How many looks the AI rotates through, per group. */
  looks: Partial<Record<TemplateGroup, number>>;
  /** Skills that have a newer market version. */
  updates: string[];
}

/** A skill lists blocks ("remotion/vox") or a whole tool ("remotion"). */
export function channelToolkit(skills: SkillRefs[], tools: ToolRef[]): Toolkit {
  const all = tools.flatMap((t) => t.blocks);
  const allows = (s: SkillRefs, ref: string) => s.tools.some((t) => t === ref || tools.some((x) => x.id === t && x.blocks.some((b) => b.ref === ref)));
  const used = all.filter((b) => skills.some((s) => allows(s, b.ref)));
  const catalog = templateCatalog(all);
  const looks: Toolkit['looks'] = {};
  const has = (...refs: string[]) => refs.some((r) => used.some((b) => b.ref === r));
  const count = (g: TemplateGroup) => catalog.filter((t) => t.group === g).length;
  if (has('remotion/kinetic')) looks.text = count('text');
  if (has('remotion/picture', 'remotion/vox', 'remotion/kinetic')) looks.entrance = count('entrance');
  if (has('remotion/picture', 'remotion/vox')) {
    looks.camera = count('camera');
    looks.fx = count('fx');
    looks.cut = count('cut');
  }
  return {
    blocks: used.map((b) => ({ ref: b.ref, name: b.name, skills: skills.filter((s) => allows(s, b.ref)).map((s) => s.name) })),
    unused: all.filter((b) => !used.includes(b)).map((b) => ({ ref: b.ref, name: b.name })),
    looks,
    updates: skills.filter((s) => s.update).map((s) => s.name),
  };
}
