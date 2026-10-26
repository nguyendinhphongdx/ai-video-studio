import { imageStyleOf } from '../scenes/assets';
import { MEDIA_MUSIC_PREFIX } from '../domain/catalog';
import { fallbackDesign } from '../domain/design';
import { UserFacingError } from '../domain/errors';
import type { Render } from '../domain/episode';
import type { CoreDeps, ProgressFn } from '../ports';
import type { AssembleOutput, ProductionContext, ThumbnailOutput } from '../pipeline/production';
import { runPipeline } from '../pipeline/step';
import { PRODUCTION_STEPS } from '../pipeline/steps';
import type { RenderBrand } from '../tools/tool';

import { buildContext } from './context';

export async function renderBrand(deps: Pick<CoreDeps, 'media'>, channel: ProductionContext['channel']): Promise<RenderBrand> {
  return {
    name: channel.name,
    font: channel.font,
    logoSrc: channel.logoPath ? await deps.media.dataUri(deps.media.absolute(channel.logoPath)) : null,
    avatarSrc: channel.avatarPath ? await deps.media.dataUri(deps.media.absolute(channel.avatarPath)) : null,
    introDesign: channel.introDesign ?? fallbackDesign('intro', channel.palette),
    outroDesign: channel.outroDesign ?? fallbackDesign('outro', channel.palette),
    introArtSrc: channel.introArtPath ? await deps.media.dataUri(deps.media.absolute(channel.introArtPath)) : null,
    outroArtSrc: channel.outroArtPath ? await deps.media.dataUri(deps.media.absolute(channel.outroArtPath)) : null,
    outroText: channel.outroText,
    subscribeText: channel.subscribeText,
    palette: channel.palette,
  };
}

export async function produce(deps: CoreDeps, episodeId: string, progress: ProgressFn): Promise<Render[]> {
  const episode = await deps.episodes.get(episodeId);
  if (!episode.scenes.length) throw new UserFacingError('Kịch bản chưa có cảnh nào');
  const pending = episode.scenes.filter((s) => !s.approved).length;
  if (pending) throw new UserFacingError(`Còn ${pending} cảnh chưa duyệt. Duyệt hết các cảnh rồi sản xuất.`);
  for (const s of episode.scenes) if (!deps.tools.block(s.block)) throw new UserFacingError(`Cảnh dùng khối không tồn tại: @${s.block}`);
  const ctx = await buildContext(deps, episode);
  const track = ctx.channel.music;
  const music = !episode.music || track === 'none' ? null : track.startsWith(MEDIA_MUSIC_PREFIX) ? deps.media.absolute(track.slice(MEDIA_MUSIC_PREFIX.length)) : deps.media.asset(`audio/${track}`);
  const production: ProductionContext = {
    deps,
    episode,
    channel: ctx.channel,
    imageStyle: imageStyleOf(ctx),
    format: ctx.format,
    slots: ctx.slots,
    bible: ctx.series?.version.bible ?? null,
    brand: await renderBrand(deps, ctx.channel),
    dir: await deps.media.episodeDir(episodeId),
    music,
  };
  const outputs = await runPipeline(PRODUCTION_STEPS, production, { episodeId, store: deps.stepRuns, progress });
  const { thumbnails } = outputs.thumbnail as ThumbnailOutput;
  const saved = await deps.episodes.replaceRenders(episodeId, (outputs.assemble as AssembleOutput).renders.map((r) => ({ ...r, thumbnailPath: thumbnails[r.format] ?? null })));
  await deps.episodes.update(episodeId, { status: 'video_review' });
  await deps.episodes.addEvent(episodeId, 'Video đã sẵn sàng, chờ duyệt');
  await deps.events.publish({ type: 'episode.produced', episodeId });
  return saved;
}
