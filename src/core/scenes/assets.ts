// Per-scene pictures and voices. A scene's work is "fresh" when what was generated matches what the scene says now;
// editing the narration or the picture prompt makes the old file stale (kept, but not used) and withdraws the approval.
import { DEFAULT_IMAGE_STYLE } from '../domain/catalog';
import { UserFacingError } from '../domain/errors';
import type { Scene, SceneAssets } from '../domain/episode';
import { hashOf } from '../pipeline/step';
import { cleanProps } from '../tools/tool';
import type { ToolCatalog } from '../tools/catalog';

export interface ImageSpec {
  prompt: string;
  hash: string;
}

type StyleCtx = { skill: { imageStyle: string }; channel: { imageStyle: string }; series?: { version: { bible: { characterAssets?: string[]; characters?: string } } } | null };

/** Reference pictures (media paths) of the series' recurring characters; every scene picture is made against them. */
export const characterRefs = (ctx: Partial<Pick<StyleCtx, 'series'>>): string[] => ctx.series?.version.bible.characterAssets ?? [];

/** Separates the style proper from the character rule, so a background-only block can drop the rule. */
export const CHARACTER_MARK = '\u2063';
const CHARACTER_RULE = 'Keep every recurring character exactly as in the attached reference images when the scene is about them: same face, proportions, hair, outfit and colours, in this same drawing style. Never add them to a scene about other subjects; draw any other character described in the notes from the notes.';

/**
 * The picture style a video is made in: the skill's own look first, else the channel's, plus the series' character
 * rule. Folding the characters in here makes the hash of every picture change when the reference images change.
 */
export const imageStyleOf = (ctx: StyleCtx): string => {
  const base = ctx.skill.imageStyle.trim() || ctx.channel.imageStyle;
  const refs = characterRefs(ctx);
  if (!refs.length) return base;
  const notes = ctx.series?.version.bible.characters?.trim();
  const ids = refs.map((r) => r.split(/[\\/]/).pop()).join(', ');
  return `${base}${CHARACTER_MARK}${CHARACTER_RULE}${notes ? ` Characters: ${notes}` : ''} (references: ${ids})`;
};

/** Whether the scene's picture is made with the series' character references and rules. */
export function usesCharacters(scene: Scene, tools: ToolCatalog): boolean {
  const slot = tools.block(scene.block)?.image;
  return Boolean(slot) && !slot!.background && !slot!.withoutCharacters?.(scene.props);
}

/** The final picture prompt of a scene (its subject + the block's or the channel's style), or null when the block needs no picture. */
export function imageSpec(scene: Scene, tools: ToolCatalog, channelStyle: string): ImageSpec | null {
  const slot = tools.block(scene.block)?.image;
  if (!slot) return null;
  const subject = String(scene.props[slot.promptKey] ?? '').trim();
  if (!subject) throw new UserFacingError('Có cảnh chưa có mô tả ảnh. Điền "Mô tả ảnh" của cảnh rồi thử lại.');
  const framing = slot.compose?.(scene.props).trim();
  // A scene without the series' characters must not be told to draw them.
  const style = usesCharacters(scene, tools) ? channelStyle : channelStyle.split(CHARACTER_MARK)[0]!;
  // The skill's own look may talk about characters; the last words of the prompt win, so say it again at the end.
  const plate = slot.background ? ' Final rule: this is an empty background plate. Do not draw any person, character, animal, figure or creature anywhere in the picture; scenery and objects only.' : '';
  const prompt = `${subject}${framing ? `. ${framing}` : ''}. ${style.trim() || slot.style || DEFAULT_IMAGE_STYLE}${plate}`;
  return { prompt, hash: hashOf(prompt) };
}

export const voiceHashOf = (voice: string, narration: string): string => hashOf({ voice, text: narration.trim() });
export const needsVoice = (scene: Scene): boolean => scene.narration.trim().length > 0;

export interface SceneReadiness {
  needsImage: boolean;
  imageFresh: boolean;
  needsVoice: boolean;
  voiceFresh: boolean;
  /** Everything the scene needs exists and matches its content: it can be approved. */
  ready: boolean;
}

export function readiness(scene: Scene, ctx: { tools: ToolCatalog; channelStyle: string; voice: string }): SceneReadiness {
  const spec = (() => {
    try {
      return imageSpec(scene, ctx.tools, ctx.channelStyle);
    } catch {
      return null;
    }
  })();
  const imageNeeded = Boolean(ctx.tools.block(scene.block)?.image);
  const imageFresh = imageNeeded ? Boolean(spec && scene.assets.imagePath && scene.assets.imageHash === spec.hash) : true;
  const voiceNeeded = needsVoice(scene);
  const voiceFresh = voiceNeeded ? Boolean(scene.assets.voicePath && scene.assets.voiceHash === voiceHashOf(ctx.voice, scene.narration)) : true;
  return { needsImage: imageNeeded, imageFresh, needsVoice: voiceNeeded, voiceFresh, ready: imageFresh && voiceFresh };
}

/**
 * A scene's props as the block would store them today. Scenes saved before a block gained a prop lack it; comparing
 * them as stored would make every old scene look "edited" (and lose its approval) the first time anything is saved.
 */
export function currentProps(scene: Scene, tools: ToolCatalog): string {
  const block = tools.block(scene.block);
  try {
    return JSON.stringify(block ? cleanProps(block, scene.props) : scene.props);
  } catch {
    return JSON.stringify(scene.props);
  }
}

const sameContent = (a: Scene, b: Scene, tools: ToolCatalog) => a.slotId === b.slotId && a.block === b.block && a.narration === b.narration && currentProps(a, tools) === currentProps(b, tools);

/**
 * A rewritten script keeps the work already done: a scene identical to an old one inherits its id, assets and approval;
 * otherwise it may still reuse a picture or voice that matches its own prompt/text.
 */
export function carryOver(previous: Scene[], next: Scene[], ctx: { tools: ToolCatalog; channelStyle: string; voice: string }): Scene[] {
  const unused = [...previous];
  const take = (pred: (s: Scene) => boolean) => {
    const i = unused.findIndex(pred);
    return i >= 0 ? unused.splice(i, 1)[0]! : null;
  };
  return next.map((scene) => {
    const same = take((p) => sameContent(p, scene, ctx.tools));
    if (same) return { ...scene, id: same.id, approved: same.approved, assets: same.assets };
    const assets: SceneAssets = { imagePath: null, imageHash: null, voicePath: null, voiceSeconds: null, voiceHash: null };
    const spec = (() => {
      try {
        return imageSpec(scene, ctx.tools, ctx.channelStyle);
      } catch {
        return null;
      }
    })();
    if (spec) {
      const donor = previous.find((p) => p.assets.imageHash === spec.hash && p.assets.imagePath);
      if (donor) Object.assign(assets, { imagePath: donor.assets.imagePath, imageHash: donor.assets.imageHash });
    }
    if (needsVoice(scene)) {
      const h = voiceHashOf(ctx.voice, scene.narration);
      const donor = previous.find((p) => p.assets.voiceHash === h && p.assets.voicePath);
      if (donor) Object.assign(assets, { voicePath: donor.assets.voicePath, voiceSeconds: donor.assets.voiceSeconds, voiceHash: donor.assets.voiceHash });
    }
    return { ...scene, assets };
  });
}
