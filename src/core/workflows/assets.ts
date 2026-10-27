// Generates the pictures and voices of scenes, one scene at a time, only when asked. This is the only place (besides
// the AI that writes text) that calls paid providers: production later just joins what was approved.
import path from 'node:path';

import { UserFacingError } from '../domain/errors';
import type { CoreDeps, ProgressFn } from '../ports';
import { imageSpec, imageStyleOf, needsVoice, readiness, voiceHashOf } from '../scenes/assets';

import { buildContext } from './context';

export interface SceneAssetsRequest {
  /** Scenes to work on; null = every scene. */
  sceneIds: string[] | null;
  image: boolean;
  voice: boolean;
  /** Make it again even though the current one still matches the scene ("Tạo lại"); a new picture then differs from the old one. */
  force?: boolean;
}

/** Appended on a redo so the model does not paint the same picture again. */
const REDO_HINTS = ['Take a different camera angle and a different arrangement of the elements.', 'Reframe the shot: move closer or farther, change the subject placement and the background details.', 'Use a fresh composition with a different viewpoint and different supporting objects.', 'Show the same idea from another side, with a different layout and scale of the subject.'];

export async function generateSceneAssets(deps: CoreDeps, episodeId: string, req: SceneAssetsRequest, progress: ProgressFn): Promise<{ images: number; voices: number }> {
  const episode = await deps.episodes.get(episodeId);
  const ctx = await buildContext(deps, episode);
  const scenes = episode.scenes.filter((s) => !req.sceneIds || req.sceneIds.includes(s.id));
  if (!scenes.length) throw new UserFacingError('Không có cảnh nào để tạo.');
  const dir = await deps.media.episodeDir(episodeId);
  const readyCtx = { tools: deps.tools, channelStyle: imageStyleOf(ctx), voice: episode.voice };

  type Work = { kind: 'image' | 'voice'; index: number; sceneId: string };
  const work: Work[] = [];
  for (const [i, s] of episode.scenes.entries()) {
    if (!scenes.includes(s)) continue;
    const r = readiness(s, readyCtx);
    if (req.image && r.needsImage && (!r.imageFresh || req.force)) work.push({ kind: 'image', index: i, sceneId: s.id });
    if (req.voice && r.needsVoice && (!r.voiceFresh || req.force)) work.push({ kind: 'voice', index: i, sceneId: s.id });
  }
  if (!work.length) return { images: 0, voices: 0 };
  if (work.some((w) => w.kind === 'image') && !(await deps.images.isReady())) throw new UserFacingError('Chưa cài đặt tạo ảnh AI. Mở Cài đặt, nhập Google API key ở mục Tạo ảnh AI.');

  let images = 0;
  let voices = 0;
  for (const [n, w] of work.entries()) {
    const scene = episode.scenes[w.index]!;
    if (w.kind === 'image') {
      const spec = imageSpec(scene, deps.tools, readyCtx.channelStyle)!;
      // A redo writes a new file (the old name is cached by the browser) and asks for another composition.
      const redo = Boolean(req.force);
      const file = path.join(dir, 'images', `${scene.id}-${spec.hash}${redo ? `-${Date.now().toString(36)}` : ''}.png`);
      await deps.images.generate(redo ? `${spec.prompt} ${REDO_HINTS[Date.now() % REDO_HINTS.length]}` : spec.prompt, file, { sceneId: scene.id });
      await deps.episodes.updateScene(episodeId, scene.id, { imagePath: deps.media.relative(file), imageHash: spec.hash, approved: false });
      images++;
    } else if (needsVoice(scene)) {
      const hash = voiceHashOf(episode.voice, scene.narration);
      const file = path.join(dir, 'voice', `${scene.id}-${hash}.mp3`);
      const seconds = await deps.tts.synthesize(scene.narration, episode.voice, file, { sceneId: scene.id });
      await deps.episodes.updateScene(episodeId, scene.id, { voicePath: deps.media.relative(file), voiceSeconds: seconds, voiceHash: hash, approved: false });
      voices++;
    }
    progress((n + 1) / work.length, w.kind);
  }
  await deps.episodes.addEvent(episodeId, `Đã tạo ${images ? `${images} ảnh` : ''}${images && voices ? ' và ' : ''}${voices ? `${voices} giọng đọc` : ''}`);
  return { images, voices };
}
