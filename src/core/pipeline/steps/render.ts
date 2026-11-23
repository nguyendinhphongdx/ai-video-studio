import path from 'node:path';

import { FORMATS } from '../../domain/catalog';
import { UserFacingError } from '../../domain/errors';
import { buildTimeline } from '../../timeline';
import type { PipelineStep } from '../step';
import type { ImagesOutput, ProductionContext, RenderOutput, VoiceOutput } from '../production';

/** One clip per scene per format, each drawn by the scene's own tool. */
export const renderStep: PipelineStep<ProductionContext, RenderOutput> = {
  id: 'render',
  label: 'Dựng cảnh',
  after: ['voice', 'images'],
  weight: 75,
  inputs: ({ episode, channel, bible }) => ({ formats: episode.formats, scenes: episode.scenes.map((s) => [s.id, s.block, s.props]), brand: channel.updatedAt, sprites: bible?.characterSprites ?? {}, cast: bible?.characterCast ?? {} }),
  reusable: async ({ deps }, out) => (await Promise.all(Object.values(out.clips).flat().map((f) => deps.media.exists(f)))).every(Boolean),
  async run({ deps, episode, brand, dir, bible }, prev, progress) {
    const voice = prev.voice as VoiceOutput;
    const images = prev.images as ImagesOutput;
    const scenes = episode.scenes;
    const minSeconds = (ref: string) => {
      const b = deps.tools.block(ref);
      if (!b) throw new UserFacingError(`Cảnh dùng khối không tồn tại: @${ref}`);
      return b.minSeconds;
    };
    const timeline = buildTimeline(scenes, minSeconds, (s) => voice.lines[s.id]?.seconds ?? 0);
    const narration = new Map<string, string>();
    for (const [id, line] of Object.entries(voice.lines)) narration.set(id, await deps.media.dataUri(line.file));

    const pictures = new Map<string, string>();
    for (const [id, file] of Object.entries(images.files)) pictures.set(id, await deps.media.dataUri(file));

    // Whole-body sprites of the series' puppet character, inlined once for the scenes that act with it.
    const sprites: Record<string, string> = {};
    const cast: Record<string, string> = {};
    if (scenes.some((s) => s.block === 'remotion/puppet')) {
      for (const [expr, rel] of Object.entries(bible?.characterSprites ?? {})) {
        const file = deps.media.absolute(rel);
        if (await deps.media.exists(file)) sprites[expr] = await deps.media.dataUri(file);
      }
      for (const id of new Set(scenes.filter((s) => s.block === 'remotion/puppet').flatMap((s) => [s.props.companion, s.props.item]).filter((v): v is string => typeof v === 'string' && v !== ''))) {
        const rel = bible?.characterCast?.[id];
        if (!rel) throw new UserFacingError(`Cảnh "Nhân vật diễn" gọi "${id}" nhưng series chưa có ảnh này trong dàn nhân vật phụ.`);
        cast[id] = await deps.media.dataUri(deps.media.absolute(rel));
      }
      if (!sprites.neutral) throw new UserFacingError('Cảnh "Nhân vật diễn" cần ảnh nhân vật Bình thường. Tải ảnh ở phần Nhân vật diễn của series rồi thử lại.');
    }

    const clips: RenderOutput['clips'] = {};
    const total = episode.formats.length * scenes.length;
    for (const [fi, format] of episode.formats.entries()) {
      const { width, height } = FORMATS[format];
      clips[format] = [];
      for (const [si, scene] of scenes.entries()) {
        const step = fi * scenes.length + si;
        const block = deps.tools.block(scene.block)!;
        const outFile = path.join(dir, 'clips', format, `${si}.mp4`);
        await deps.renderers.get(block.tool.id).render(
          {
            block: block.ref,
            props: { ...scene.props, ...(pictures.has(scene.id) ? { image: pictures.get(scene.id) } : {}), ...(scene.block === 'remotion/puppet' ? { sprites, cast } : {}) },
            ordinal: scenes.slice(0, si + 1).filter((x) => x.block === scene.block).length,
            brand,
            format,
            width,
            height,
            durationSec: timeline.scenes[si]!.duration,
            narrationSrc: narration.get(scene.id) ?? null,
          },
          { outFile, workDir: path.join(dir, 'work', format, String(si)), onProgress: (f) => progress((step + f) / total) },
        );
        clips[format].push(outFile);
        progress((step + 1) / total);
      }
    }
    return { durations: timeline.scenes.map((t) => t.duration), clips };
  },
};
