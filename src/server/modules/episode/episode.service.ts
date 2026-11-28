import fs from 'node:fs/promises';
import path from 'node:path';

import { compileContext } from '@/core/context/layer';
import { emptyAssets, UserFacingError, type Episode, type JobKind, type Scene } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import { parseDraft, extractJson, scriptSchema, slotBlocks } from '@/core/script/script';
import { emptyPublishKit } from '@/core/script/publish';
import { cleanProps } from '@/core/tools/tool';
import { runTask } from '@/core/agent/runner';
import { fixSceneTask, type CastMember, type SceneFix } from '@/core/tasks/fix-scene';
import { currentProps, imageSpec, imageStyleOf, readiness } from '@/core/scenes/assets';
import { buildContext, templateVars } from '@/core/workflows/context';
import { suggestTopics } from '@/core/workflows/suggest';
import { scriptIssues } from '@/core/workflows/quality';
import { importScript } from '@/core/workflows/script';
import { reviseEpisodeTask } from '@/core/tasks/revise-episode';
import { writeEpisodeTask } from '@/core/tasks/write-episode';
import { draftFromScenes, withLockedScenes } from '@/core/script/script';
import { z } from 'zod';
import { llm } from '@/server/adapters/llm/llm.service';
import { mediaUrl, removeEpisodeMedia } from '@/server/adapters/media/media.service';
import { voiceAvailable } from '@/server/adapters/tts/tts.service';
import { appDeps } from '@/server/core-deps';
import { now } from '@/server/db';
import { conflict } from '@/server/http/api-error';
import type { SeriesBible } from '@/core/domain/series';
import { aiRunRepository } from '@/server/modules/ai-run/ai-run.repository';
import { channelService } from '@/server/modules/channel/channel.service';
import { seriesRepository } from '@/server/modules/series/series.repository';
import { withUsage } from '@/server/context';
import { jobRepository } from '@/server/modules/job/job.repository';
import { seriesService } from '@/server/modules/series/series.service';
import { skillService } from '@/server/modules/skill/skill.service';

import { episodeRepository } from './episode.repository';
import { loadEpisode } from './episode.store';
import type { ApprovalInput, CreateEpisodeInput, EpisodeOptionsInput, EpisodeView, SaveScriptInput, SceneAssetView, SceneAssetsInput, SceneFixInput, ScenePicture } from './episode.types';

async function visibleJob(episodeId: string) {
  const active = await jobRepository.active(episodeId);
  if (active) return active;
  const latest = await jobRepository.latest(episodeId);
  return latest?.state === 'failed' ? latest : null;
}

async function enqueue(episodeId: string, kind: JobKind, payload: Record<string, unknown> = {}) {
  if (await jobRepository.active(episodeId)) throw conflict('Video đang có việc chạy, chờ xong rồi thử lại.');
  const job = await jobRepository.insert(episodeId, kind, payload);
  await episodeRepository.touch(episodeId);
  return job;
}

async function baseView(e: Episode): Promise<EpisodeView> {
  return {
    episode: e,
    job: await visibleJob(e.id),
    renders: (await episodeRepository.renders(e.id)).map((r) => ({ ...r, url: mediaUrl(r.filePath), thumbnailUrl: r.thumbnailPath ? mediaUrl(r.thumbnailPath) : null })),
    events: await episodeRepository.events(e.id),
    issues: [],
    knowledge: { used: e.knowledgeVersion, current: null },
    series: { used: e.seriesVersion, current: null },
    assets: {},
    slots: [],
    durationSec: null,
    sprites: {},
    cast: {},
  };
}

function sceneAssetViews(e: Episode, channelStyle: string): Record<string, SceneAssetView> {
  const out: Record<string, SceneAssetView> = {};
  for (const s of e.scenes) {
    const r = readiness(s, { tools: appDeps.tools, channelStyle, voice: e.voice });
    out[s.id] = {
      imageUrl: r.needsImage && r.imageFresh && s.assets.imagePath ? mediaUrl(s.assets.imagePath) : null,
      voiceUrl: r.needsVoice && r.voiceFresh && s.assets.voicePath ? mediaUrl(s.assets.voicePath) : null,
      voiceSeconds: r.needsVoice && r.voiceFresh ? s.assets.voiceSeconds : null,
      needsImage: r.needsImage,
      needsVoice: r.needsVoice,
      imageStale: r.needsImage && !r.imageFresh && Boolean(s.assets.imagePath),
      voiceStale: r.needsVoice && !r.voiceFresh && Boolean(s.assets.voicePath),
      ready: r.ready,
    };
  }
  return out;
}

const editable = (e: Episode) => e.status === 'draft' || e.status === 'script_review';

/** What a scene may name by id: the series' supporting characters, props and the hero's own poses. */
export function castOf(bible: SeriesBible | undefined): CastMember[] {
  if (!bible) return [];
  const planned = new Map((bible.library ?? []).map((x) => [x.id, x]));
  const cast = Object.keys(bible.characterCast ?? {})
    .filter((k) => !k.includes(':'))
    .map((id): CastMember => ({ id, kind: planned.get(id)?.kind === 'item' ? 'item' : 'character', about: planned.get(id) ? `${planned.get(id)!.name}. ${planned.get(id)!.description}` : id }));
  const poses = Object.entries(bible.customPoses ?? {}).map(([id, about]): CastMember => ({ id, kind: 'pose', about }));
  return [...cast, ...poses];
}

export const episodeService = {
  /** Next-video ideas from the channel's identity, knowledge and the videos it already has. */
  async topicIdeas(channelId: string): Promise<{ topic: string; why: string }[]> {
    await channelService.get(channelId);
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt để nhận gợi ý chủ đề.');
    const recent = await Promise.all((await episodeRepository
      .list({ channelId }))
      .slice(0, 30)
      .map(async (e) => ({ topic: e.topic, title: e.title, status: e.status, series: e.seriesId ? ((await seriesRepository.find(e.seriesId))?.name ?? null) : null })));
    return withUsage({ channelId, purpose: 'suggest-topics' }, () => suggestTopics(appDeps, channelId, recent, 5));
  },

  async list(filter: { channelId?: string; seriesId?: string } = {}): Promise<EpisodeView[]> {
    return Promise.all((await episodeRepository.list(filter)).map(baseView));
  },

  async get(id: string): Promise<EpisodeView> {
    let e = await loadEpisode(id);
    let ctx = await buildContext(appDeps, e);
    if (editable(e) && e.scenes.length) {
      // Scripts written before the channel's intro/outro became locked slots get them now.
      const filled = withLockedScenes(ctx.slots, e.scenes, templateVars(ctx, e.title), appDeps.tools);
      if (filled) {
        await episodeRepository.update(id, { scenes: filled });
        e = await loadEpisode(id);
        ctx = await buildContext(appDeps, e);
      }
    }
    const slots = ctx.slots.map((s) => ({
      id: s.id,
      name: s.name,
      fill: s.fill,
      blocks: s.fill === 'ai' ? slotBlocks(s, appDeps.tools).map((b) => b.ref) : [],
      scenes: s.scenes,
    }));
    return { ...await baseView(e), knowledge: { used: e.knowledgeVersion, current: ctx.knowledge?.version ?? null }, series: { used: e.seriesVersion, current: ctx.series?.series.currentVersion ?? null }, assets: sceneAssetViews(e, imageStyleOf(ctx)), issues: await scriptIssues(appDeps, e).catch(() => []), slots, durationSec: ctx.format.durationSec, sprites: Object.fromEntries(Object.entries(ctx.series?.version.bible.characterSprites ?? {}).map(([k, v]) => [k, mediaUrl(v)])), cast: Object.fromEntries(Object.entries(ctx.series?.version.bible.characterCast ?? {}).map(([k, v]) => [k, mediaUrl(v)])) };
  },

  async create(input: CreateEpisodeInput): Promise<EpisodeView> {
    const channel = await channelService.get(input.channelId);
    const series = input.seriesId ? await seriesService.get(input.seriesId) : null;
    if (series && series.channelId !== channel.id) throw conflict('Series không thuộc kênh này');
    const skillId = series?.rules.skillId ?? input.skillId ?? channel.defaultSkillId;
    if (!skillId) throw new UserFacingError('Chọn một skill cho video');
    await skillService.get(channel.id, skillId);
    const ts = now();
    const id = newId();
    await episodeRepository.insert({
      id,
      channelId: channel.id,
      seriesId: series?.id ?? null,
      seriesVersion: null,
      number: series ? await episodeRepository.nextNumber(series.id) : null,
      topic: input.topic,
      goal: input.goal,
      notes: input.notes,
      skillId,
      status: input.planOnly ? 'planned' : 'draft',
      formats: input.formats,
      voice: input.voice ?? channel.voice,
      music: input.music,
      musicVolume: 0.12,
      sceneCount: input.sceneCount,
      createdAt: ts,
      updatedAt: ts,
    });
    await episodeRepository.addEvent(id, series ? `Thêm tập vào series ${series.name}: ${input.topic}` : `Tạo video: ${input.topic}`);
    if (!input.planOnly && (await llm.isReady())) await enqueue(id, 'write_script');
    return await episodeService.get(id);
  },

  async remove(id: string) {
    await loadEpisode(id);
    if ((await jobRepository.active(id))?.state === 'running') throw conflict('Video đang được xử lý, chờ xong rồi xoá.');
    await episodeRepository.remove(id);
    await removeEpisodeMedia(id);
  },

  /**
   * Moves a written episode onto the series' current version (new characters, poses, bible and format), so its scenes
   * use them from the next preview or render. The script itself is kept; nothing is regenerated.
   */
  async useLatestSeries(id: string): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (!e.seriesId) throw conflict('Tập này không thuộc series nào.');
    if (e.status === 'published') throw conflict('Tập đã xuất bản, không đổi phiên bản series nữa.');
    if ((await visibleJob(id))?.state === 'running' || (await visibleJob(id))?.state === 'queued') throw conflict('Tập đang chạy một việc, chờ xong rồi thử lại.');
    const series = await appDeps.series.get(e.seriesId);
    if (series && e.seriesVersion !== series.currentVersion) await episodeRepository.update(id, { seriesVersion: series.currentVersion });
    return await episodeService.get(id);
  },

  async updateOptions(id: string, input: EpisodeOptionsInput): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    const touchesBrief = input.topic !== undefined || input.goal !== undefined || input.notes !== undefined;
    if (touchesBrief && !(e.status === 'planned' || editable(e))) throw conflict('Kịch bản đã được duyệt, không đổi được chủ đề nữa.');
    const { skillId, ...rest } = input;
    if (skillId !== undefined && skillId !== e.skillId) return await episodeService.changeSkill(id, skillId, rest);
    await episodeRepository.update(id, rest);
    return await episodeService.get(id);
  },

  /** A one-off video follows another skill: its scenes were written for the old one, so they are cleared and written again. */
  async changeSkill(id: string, skillId: string, rest: Omit<EpisodeOptionsInput, 'skillId'> = {}): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (e.seriesId) throw conflict('Video của series dùng skill của series. Đổi skill trong phần Format của series.');
    if (!(e.status === 'planned' || editable(e))) throw conflict('Kịch bản đã được duyệt, không đổi được kiểu video nữa.');
    if (await jobRepository.active(id)) throw conflict('Video đang có việc chạy, chờ xong rồi đổi.');
    const { skill } = await skillService.get(e.channelId, skillId);
    await episodeRepository.update(id, { ...rest, skillId, scenes: [], title: '', publish: null, status: 'draft' });
    await episodeRepository.addEvent(id, `Đổi kiểu video sang "${skill.name}", kịch bản được viết lại`);
    if (await llm.isReady()) await enqueue(id, 'write_script');
    return await episodeService.get(id);
  },

  /** Save the person's edits. Scenes are editable before production; locked scenes never; the publish kit any time. */
  async saveScript(id: string, input: SaveScriptInput): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (await jobRepository.active(id)) throw conflict('Video đang có việc chạy, chờ xong rồi lưu.');
    const key = (list: { slotId: string; block: string; narration: string; props: unknown; locked?: boolean }[]) => JSON.stringify(list.map((s) => [s.slotId, s.block, s.narration, s.props]));
    const scenesChanged = key(input.scenes) !== key(e.scenes);
    if (scenesChanged && !editable(e)) throw conflict('Kịch bản đã được duyệt. Gửi yêu cầu sửa để quay lại bước kịch bản.');
    let scenes: Scene[] | undefined;
    if (scenesChanged) {
      const ctx = await buildContext(appDeps, e);
      const lockedById = new Map(e.scenes.filter((s) => s.locked).map((s) => [s.id, s]));
      const byId = new Map(e.scenes.map((s) => [s.id, s]));
      scenes = input.scenes.map((s) => {
        if (s.locked) {
          const original = s.id ? lockedById.get(s.id) : undefined;
          if (!original) throw new UserFacingError('Không sửa được cảnh bị khoá của series');
          return original;
        }
        const slot = ctx.slots.find((x) => x.id === s.slotId && x.fill === 'ai');
        if (!slot) throw new UserFacingError(`Phần "${s.slotId}" không có trong khung tập`);
        const block = slotBlocks(slot, appDeps.tools).find((b) => b.ref === s.block);
        if (!block) throw new UserFacingError(`Phần "${slot.name}" không cho dùng khối @${s.block}`);
        const next: Scene = { id: s.id ?? newId(), slotId: slot.id, block: block.ref, locked: false, narration: s.narration.trim(), props: cleanProps(block, s.props), approved: false, assets: emptyAssets() };
        // Work already done stays with the scene; an edit withdraws the approval (stale files are ignored until regenerated).
        const prev = s.id ? byId.get(s.id) : undefined;
        if (!prev) return next;
        const unchanged = prev.block === next.block && prev.narration === next.narration && currentProps(prev, appDeps.tools) === JSON.stringify(next.props);
        return { ...next, assets: prev.assets, approved: prev.approved && unchanged };
      });
    }
    await episodeRepository.update(id, {
      title: input.title,
      publish: input.publish,
      ...(scenes ? { scenes } : {}),
      ...(e.status === 'draft' && scenes?.length ? { status: 'script_review' as const } : {}),
    });
    await episodeRepository.addEvent(id, scenesChanged ? 'Đã lưu chỉnh sửa kịch bản' : 'Đã lưu nội dung đăng bài');
    return await episodeService.get(id);
  },

  /** Queues scripts for several planned episodes of a series, oldest number first; the worker writes them one by one. */
  async requestScripts(seriesId: string, episodeIds: string[]): Promise<EpisodeView[]> {
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt, hoặc viết từng tập bằng cách dán kịch bản.');
    const all = await episodeRepository.list({ seriesId });
    const picked = [...new Set(episodeIds)].map((id) => all.find((e) => e.id === id));
    if (picked.some((e) => !e)) throw new UserFacingError('Có tập không thuộc series này');
    const todo = (picked as Episode[]).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    let blocked: Episode | undefined;
    for (const e of todo) if (e.status !== 'planned' || (await jobRepository.active(e.id))) { blocked = e; break; }
    if (blocked) throw conflict(`Tập ${blocked.number} đã được viết hoặc đang có việc chạy.`);
    for (const e of todo) {
      await episodeRepository.update(e.id, { status: 'draft' });
      await enqueue(e.id, 'write_script');
    }
    return Promise.all(todo.map((e) => episodeService.get(e.id)));
  },

  async requestScript(id: string): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (!(e.status === 'planned' || editable(e))) throw conflict('Kịch bản đã được duyệt. Gửi yêu cầu sửa để quay lại bước kịch bản.');
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt, hoặc dùng chế độ dán kịch bản.');
    if (e.status === 'planned') await episodeRepository.update(id, { status: 'draft' });
    await enqueue(id, 'write_script');
    return await episodeService.get(id);
  },

  async revise(id: string, feedback: string): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (!e.scenes.length) throw new UserFacingError('Chưa có kịch bản để sửa');
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Dùng "Copy prompt" để nhờ Claude sửa.');
    await enqueue(id, 'revise_script', { feedback });
    await episodeRepository.addEvent(id, `Nhờ AI sửa: ${feedback}`);
    return await episodeService.get(id);
  },

  /** One AI call proposing a fix for one scene. Nothing is saved: the person reads it, then saves like any edit. */
  /** Who and what this episode's series can put on screen, and which of them are things. */
  async cast(id: string): Promise<CastMember[]> {
    return castOf((await buildContext(appDeps, await loadEpisode(id))).series?.version.bible);
  },

  async suggestSceneFix(id: string, sceneId: string, input: SceneFixInput): Promise<SceneFix> {
    const e = await loadEpisode(id);
    if (!editable(e)) throw conflict('Kịch bản đã được duyệt. Mở lại để sửa cảnh.');
    const index = e.scenes.findIndex((s) => s.id === sceneId);
    // The draft on screen wins over what is saved, so the AI sees the words the person just typed.
    const saved = e.scenes[index];
    if (!saved) throw new UserFacingError('Cảnh không thuộc video này');
    if (saved.locked) throw new UserFacingError('Cảnh này bị khoá theo series, không sửa được.');
    const block = appDeps.tools.block(saved.block);
    if (!block) throw new UserFacingError(`Khối @${saved.block} không tồn tại`);
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt.');
    const scene: Scene = { ...saved, narration: input.narration ?? saved.narration, props: input.props ?? saved.props };
    const ctx = await buildContext(appDeps, e);
    const allowed = (ctx.slots.find((x) => x.id === scene.slotId)?.blocks ?? []).map((ref) => appDeps.tools.block(ref)).filter((b) => b !== undefined);
    const ask = (use: typeof block, from: Scene, others: typeof allowed) =>
      runTask({ llm: appDeps.llm, runs: appDeps.aiRuns, layers: appDeps.layers }, fixSceneTask, { block: use, scene: from, before: e.scenes[index - 1]?.narration ?? null, after: e.scenes[index + 1]?.narration ?? null, cast: castOf(ctx.series?.version.bible), request: input.request, others }, ctx);
    return withUsage({ channelId: e.channelId, purpose: 'fix-scene' }, async () => {
      const first = await ask(block, scene, allowed.filter((b) => b.ref !== scene.block));
      const to = first.switchTo ? appDeps.tools.block(first.switchTo) : undefined;
      if (!to) return first;
      // Asked again in the new type's own terms, keeping the words and the hand adjustments.
      const { caption, imagePrompt, transition, _tune } = first.props;
      const kept = Object.fromEntries(Object.entries({ caption, imagePrompt, transition, _tune }).filter(([, x]) => x !== undefined));
      return ask(to, { ...scene, block: to.ref, narration: first.narration, props: { ...(to.defaults as Record<string, unknown>), ...kept } }, []);
    });
  },

  /** Every picture ever drawn for a scene that is still on disk, newest first: a redraw never deletes the one before. */
  async scenePictures(id: string, sceneId: string): Promise<ScenePicture[]> {
    const e = await loadEpisode(id);
    const scene = e.scenes.find((s) => s.id === sceneId);
    if (!scene) throw new UserFacingError('Cảnh không thuộc video này');
    const dir = path.join(await appDeps.media.episodeDir(id), 'images');
    const names = (await fs.readdir(dir).catch(() => [] as string[])).filter((n) => n.startsWith(`${sceneId}-`) && n.endsWith('.png'));
    const dated = await Promise.all(names.map(async (name) => ({ name, at: (await fs.stat(path.join(dir, name))).mtimeMs })));
    return dated.sort((a, b) => b.at - a.at).map(({ name }) => {
      const rel = appDeps.media.relative(path.join(dir, name));
      return { name, url: mediaUrl(rel), current: scene.assets.imagePath === rel };
    });
  },

  /** Puts an earlier picture back on the scene. The person picked it, so it counts as matching today's description. */
  async useScenePicture(id: string, sceneId: string, name: string): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (!editable(e)) throw conflict('Kịch bản đã được duyệt. Mở lại để sửa cảnh.');
    if (await jobRepository.active(id)) throw conflict('Video đang có việc chạy, chờ xong rồi đổi ảnh.');
    const scene = e.scenes.find((s) => s.id === sceneId);
    // The name must be one we listed: it never becomes a path otherwise.
    if (!scene || !(await episodeService.scenePictures(id, sceneId)).some((p) => p.name === name)) throw new UserFacingError('Không tìm thấy ảnh này');
    const ctx = await buildContext(appDeps, e);
    const spec = imageSpec(scene, appDeps.tools, imageStyleOf(ctx));
    if (!spec) throw new UserFacingError('Cảnh này không dùng ảnh');
    const rel = appDeps.media.relative(path.join(await appDeps.media.episodeDir(id), 'images', name));
    await episodeRepository.updateScene(id, sceneId, { imagePath: rel, imageHash: spec.hash, approved: false });
    await episodeRepository.addEvent(id, 'Đã chọn lại một bản ảnh cũ');
    return await episodeService.get(id);
  },

  /** Queue pictures and/or voices for some or all scenes (worker job). This is when paid providers get called. */
  async requestAssets(id: string, input: SceneAssetsInput): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (!editable(e)) throw conflict('Kịch bản đã được duyệt. Gửi yêu cầu sửa để quay lại bước cảnh.');
    if (!e.scenes.length) throw new UserFacingError('Chưa có cảnh nào');
    if (!input.image && !input.voice) throw new UserFacingError('Chọn tạo ảnh hoặc tạo giọng');
    if (input.sceneIds?.some((sid) => !e.scenes.some((s) => s.id === sid))) throw new UserFacingError('Có cảnh không thuộc video này');
    if (input.image && !(await appDeps.images.isReady())) throw new UserFacingError('Chưa cài đặt tạo ảnh AI. Mở Cài đặt, nhập Google API key ở mục Tạo ảnh AI.');
    if (input.voice && !(await voiceAvailable(e.voice))) throw new UserFacingError('Giọng đọc đang chọn chưa dùng được (chưa cài edge-tts hoặc chưa có Google API key). Mở Cài đặt.');
    await enqueue(id, 'scene_assets', { sceneIds: input.sceneIds, image: input.image, voice: input.voice, force: input.force ?? false });
    return await episodeService.get(id);
  },

  /** Approve (or withdraw approval of) scenes. A scene can only be approved when its picture and voice exist and match it. */
  async setApproval(id: string, input: ApprovalInput): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (!editable(e)) throw conflict('Kịch bản đã được duyệt.');
    if (await jobRepository.active(id)) throw conflict('Video đang có việc chạy, chờ xong rồi duyệt.');
    const ids = input.sceneIds ?? e.scenes.map((s) => s.id);
    const targets = e.scenes.filter((s) => ids.includes(s.id));
    if (input.approved) {
      const ctx = await buildContext(appDeps, e);
      const notReady = targets.filter((s) => !readiness(s, { tools: appDeps.tools, channelStyle: imageStyleOf(ctx), voice: e.voice }).ready);
      if (notReady.length) throw conflict(`Cảnh ${notReady.map((s) => e.scenes.indexOf(s) + 1).join(', ')} còn thiếu ảnh hoặc giọng đọc (hoặc đã lỗi thời). Tạo xong rồi duyệt.`);
    }
    for (const s of targets) await episodeRepository.updateScene(id, s.id, { approved: input.approved });
    return await episodeService.get(id);
  },

  async approveScript(id: string): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (e.status !== 'script_review') throw conflict('Video không ở bước duyệt kịch bản');
    if (!e.scenes.length) throw new UserFacingError('Kịch bản chưa có cảnh nào');
    const pending = e.scenes.filter((s) => !s.approved).length;
    if (pending) throw conflict(`Còn ${pending} cảnh chưa duyệt. Duyệt hết các cảnh rồi mới ghép và sản xuất.`);
    await enqueue(id, 'produce');
    await episodeRepository.update(id, { status: 'producing' });
    await episodeRepository.addEvent(id, 'Đã duyệt kịch bản, bắt đầu sản xuất');
    await appDeps.events.publish({ type: 'episode.script_approved', episodeId: id });
    return await episodeService.get(id);
  },

  async approveVideo(id: string): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (e.status !== 'video_review') throw conflict('Video không ở bước duyệt video');
    await episodeRepository.update(id, { status: 'published' });
    await episodeRepository.addEvent(id, 'Đã duyệt video, sẵn sàng đăng');
    await appDeps.events.publish({ type: 'episode.approved', episodeId: id });
    return await episodeService.get(id);
  },

  async rejectVideo(id: string, feedback: string): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (e.status !== 'video_review' && e.status !== 'published') throw conflict('Video chưa được dựng');
    await episodeRepository.update(id, { status: 'script_review' });
    await episodeRepository.addEvent(id, feedback.trim() ? `Video bị trả lại: ${feedback}` : 'Đã mở lại video để sửa cảnh');
    await appDeps.events.publish({ type: 'episode.rejected', episodeId: id, feedback });
    if (feedback.trim() && (await llm.isReady())) await enqueue(id, 'revise_script', { feedback });
    return await episodeService.get(id);
  },

  /** Re-run the last failed job (production resumes from the failed step). */
  async retry(id: string): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    const last = await jobRepository.latest(id);
    if (!last || last.state !== 'failed') throw conflict('Không có việc nào bị lỗi để chạy lại');
    await enqueue(id, last.kind, last.payload);
    if (last.kind === 'produce') await episodeRepository.update(id, { status: 'producing' });
    else if (e.status === 'producing') await episodeRepository.update(id, { status: 'script_review' });
    return await episodeService.get(id);
  },

  /** Manual mode: the same context the agent would get, as one prompt to paste into Claude. */
  async manualPrompt(id: string, feedback?: string): Promise<string> {
    const e = await loadEpisode(id);
    const ctx = await buildContext(appDeps, e);
    const compiled = compileContext(appDeps.layers, ctx);
    const task = feedback && e.scenes.length ? reviseEpisodeTask(appDeps.tools) : writeEpisodeTask(appDeps.tools);
    const input = feedback && e.scenes.length ? { current: draftFromScenes(e.title, e.scenes, e.publish ?? emptyPublishKit()), feedback } : {};
    const schema = z.toJSONSchema(scriptSchema(ctx.slots, appDeps.tools));
    return `${compiled.text}\n\n## Nhiệm vụ\n${task.prompt(input as never, ctx)}\n\nChỉ trả về MỘT khối JSON đúng JSON Schema sau, không giải thích thêm:\n${JSON.stringify(schema)}`;
  },

  /** Manual mode: import the JSON pasted back from Claude, through the same validation as AI output. */
  async importScript(id: string, text: string): Promise<EpisodeView> {
    const e = await loadEpisode(id);
    if (!editable(e) && e.status !== 'planned') throw conflict('Kịch bản đã được duyệt');
    const ctx = await buildContext(appDeps, e);
    let raw: unknown;
    try {
      raw = extractJson(text);
    } catch {
      throw new UserFacingError('Không đọc được JSON. Hãy dán nguyên câu trả lời của Claude.');
    }
    let draft;
    try {
      draft = parseDraft(raw, ctx.slots, appDeps.tools);
    } catch (err) {
      throw new UserFacingError('Kịch bản dán vào không đúng khung tập hoặc khối của skill.', String(err));
    }
    await importScript(appDeps, id, draft);
    return await episodeService.get(id);
  },

  async aiRuns(id: string) {
    await loadEpisode(id);
    return await aiRunRepository.forEpisode(id);
  },
};
