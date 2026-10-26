// Per-scene pictures and voices. A scene's work is "fresh" when what was generated matches what the scene says now;
// editing the narration or the picture prompt makes the old file stale (kept, but not used) and withdraws the approval.
import { DEFAULT_IMAGE_STYLE } from '../domain/catalog';
import { UserFacingError } from '../domain/errors';
import type { Scene, SceneAssets } from '../domain/episode';
import { hashOf } from '../pipeline/step';
import type { ToolCatalog } from '../tools/catalog';

export interface ImageSpec {
  prompt: string;
  hash: string;
}

/** The picture style a video is made in: the skill's own look first, else the channel's. */
export const imageStyleOf = (ctx: { skill: { imageStyle: string }; channel: { imageStyle: string } }): string => ctx.skill.imageStyle.trim() || ctx.channel.imageStyle;

/** The final picture prompt of a scene (its subject + the block's or the channel's style), or null when the block needs no picture. */
export function imageSpec(scene: Scene, tools: ToolCatalog, channelStyle: string): ImageSpec | null {
  const slot = tools.block(scene.block)?.image;
  if (!slot) return null;
  const subject = String(scene.props[slot.promptKey] ?? '').trim();
  if (!subject) throw new UserFacingError('Có cảnh chưa có mô tả ảnh. Điền "Mô tả ảnh" của cảnh rồi thử lại.');
  const framing = slot.compose?.(scene.props).trim();
  const prompt = `${subject}${framing ? `. ${framing}` : ''}. ${channelStyle.trim() || slot.style || DEFAULT_IMAGE_STYLE}`;
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

const sameContent = (a: Scene, b: Scene) => a.slotId === b.slotId && a.block === b.block && a.narration === b.narration && JSON.stringify(a.props) === JSON.stringify(b.props);

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
    const same = take((p) => sameContent(p, scene));
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
