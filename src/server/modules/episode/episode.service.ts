import { compileContext } from '@/core/context/layer';
import { UserFacingError, type Episode, type JobKind, type Scene } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import { parseDraft, extractJson, scriptSchema, slotBlocks } from '@/core/script/script';
import { emptyPublishKit } from '@/core/script/publish';
import { cleanProps } from '@/core/tools/tool';
import { buildContext } from '@/core/workflows/context';
import { scriptIssues } from '@/core/workflows/quality';
import { importScript } from '@/core/workflows/script';
import { reviseEpisodeTask } from '@/core/tasks/revise-episode';
import { writeEpisodeTask } from '@/core/tasks/write-episode';
import { draftFromScenes } from '@/core/script/script';
import { z } from 'zod';
import { llm } from '@/server/adapters/llm/llm.service';
import { mediaUrl, removeEpisodeMedia } from '@/server/adapters/media/media.service';
import { appDeps } from '@/server/core-deps';
import { now } from '@/server/db';
import { conflict } from '@/server/http/api-error';
import { aiRunRepository } from '@/server/modules/ai-run/ai-run.repository';
import { channelService } from '@/server/modules/channel/channel.service';
import { jobRepository } from '@/server/modules/job/job.repository';
import { seriesService } from '@/server/modules/series/series.service';
import { skillService } from '@/server/modules/skill/skill.service';

import { episodeRepository } from './episode.repository';
import { loadEpisode } from './episode.store';
import type { CreateEpisodeInput, EpisodeOptionsInput, EpisodeView, SaveScriptInput } from './episode.types';

function visibleJob(episodeId: string) {
  const active = jobRepository.active(episodeId);
  if (active) return active;
  const latest = jobRepository.latest(episodeId);
  return latest?.state === 'failed' ? latest : null;
}

function enqueue(episodeId: string, kind: JobKind, payload: Record<string, unknown> = {}) {
  if (jobRepository.active(episodeId)) throw conflict('Video đang có việc chạy, chờ xong rồi thử lại.');
  const job = jobRepository.insert(episodeId, kind, payload);
  episodeRepository.touch(episodeId);
  return job;
}

function baseView(e: Episode): EpisodeView {
  return {
    episode: e,
    job: visibleJob(e.id),
    renders: episodeRepository.renders(e.id).map((r) => ({ ...r, url: mediaUrl(r.filePath), thumbnailUrl: r.thumbnailPath ? mediaUrl(r.thumbnailPath) : null })),
    events: episodeRepository.events(e.id),
    issues: [],
    slots: [],
    durationSec: null,
  };
}

const editable = (e: Episode) => e.status === 'draft' || e.status === 'script_review';

export const episodeService = {
  async list(filter: { channelId?: string; seriesId?: string } = {}): Promise<EpisodeView[]> {
    return episodeRepository.list(filter).map(baseView);
  },

  async get(id: string): Promise<EpisodeView> {
    const e = loadEpisode(id);
    const ctx = await buildContext(appDeps, e);
    const slots = ctx.slots.map((s) => ({
      id: s.id,
      name: s.name,
      fill: s.fill,
      blocks: s.fill === 'ai' ? slotBlocks(s, appDeps.tools).map((b) => b.ref) : [],
      scenes: s.scenes,
    }));
    return { ...baseView(e), issues: await scriptIssues(appDeps, e).catch(() => []), slots, durationSec: ctx.format.durationSec };
  },

  async create(input: CreateEpisodeInput): Promise<EpisodeView> {
    const channel = await channelService.get(input.channelId);
    const series = input.seriesId ? await seriesService.get(input.seriesId) : null;
    if (series && series.channelId !== channel.id) throw conflict('Series không thuộc kênh này');
    const skillId = series?.rules.skillId ?? input.skillId ?? channel.defaultSkillId;
    if (!skillId) throw new UserFacingError('Chọn một skill cho video');
    await skillService.get(skillId);
    const ts = now();
    const id = newId();
    episodeRepository.insert({
      id,
      channelId: channel.id,
      seriesId: series?.id ?? null,
      seriesVersion: null,
      number: series ? episodeRepository.nextNumber(series.id) : null,
      topic: input.topic,
      goal: input.goal,
      notes: input.notes,
      skillId,
      status: input.planOnly ? 'planned' : 'draft',
      formats: input.formats,
      voice: input.voice ?? channel.voice,
      music: input.music,
      sceneCount: input.sceneCount,
      createdAt: ts,
      updatedAt: ts,
    });
    episodeRepository.addEvent(id, series ? `Thêm tập vào series ${series.name}: ${input.topic}` : `Tạo video: ${input.topic}`);
    if (!input.planOnly && (await llm.isReady())) enqueue(id, 'write_script');
    return episodeService.get(id);
  },

  async remove(id: string) {
    loadEpisode(id);
    if (jobRepository.active(id)?.state === 'running') throw conflict('Video đang được xử lý, chờ xong rồi xoá.');
    episodeRepository.remove(id);
    await removeEpisodeMedia(id);
  },

  async updateOptions(id: string, input: EpisodeOptionsInput): Promise<EpisodeView> {
    loadEpisode(id);
    episodeRepository.update(id, input);
    return episodeService.get(id);
  },

  /** Save the person's edits. Scenes are editable before production; locked scenes never; the publish kit any time. */
  async saveScript(id: string, input: SaveScriptInput): Promise<EpisodeView> {
    const e = loadEpisode(id);
    if (jobRepository.active(id)) throw conflict('Video đang có việc chạy, chờ xong rồi lưu.');
    const key = (list: { slotId: string; block: string; narration: string; props: unknown; locked?: boolean }[]) => JSON.stringify(list.map((s) => [s.slotId, s.block, s.narration, s.props]));
    const scenesChanged = key(input.scenes) !== key(e.scenes);
    if (scenesChanged && !editable(e)) throw conflict('Kịch bản đã được duyệt. Gửi yêu cầu sửa để quay lại bước kịch bản.');
    let scenes: Scene[] | undefined;
    if (scenesChanged) {
      const ctx = await buildContext(appDeps, e);
      const lockedById = new Map(e.scenes.filter((s) => s.locked).map((s) => [s.id, s]));
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
        return { id: s.id ?? newId(), slotId: slot.id, block: block.ref, locked: false, narration: s.narration.trim(), props: cleanProps(block, s.props) };
      });
    }
    episodeRepository.update(id, {
      title: input.title,
      publish: input.publish,
      ...(scenes ? { scenes } : {}),
      ...(e.status === 'draft' && scenes?.length ? { status: 'script_review' as const } : {}),
    });
    episodeRepository.addEvent(id, scenesChanged ? 'Đã lưu chỉnh sửa kịch bản' : 'Đã lưu nội dung đăng bài');
    return episodeService.get(id);
  },

  async requestScript(id: string): Promise<EpisodeView> {
    const e = loadEpisode(id);
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt, hoặc dùng chế độ dán kịch bản.');
    if (e.status === 'planned') episodeRepository.update(id, { status: 'draft' });
    enqueue(id, 'write_script');
    return episodeService.get(id);
  },

  async revise(id: string, feedback: string): Promise<EpisodeView> {
    const e = loadEpisode(id);
    if (!e.scenes.length) throw new UserFacingError('Chưa có kịch bản để sửa');
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Dùng "Copy prompt" để nhờ Claude sửa.');
    enqueue(id, 'revise_script', { feedback });
    episodeRepository.addEvent(id, `Nhờ AI sửa: ${feedback}`);
    return episodeService.get(id);
  },

  async approveScript(id: string): Promise<EpisodeView> {
    const e = loadEpisode(id);
    if (e.status !== 'script_review') throw conflict('Video không ở bước duyệt kịch bản');
    if (!e.scenes.length) throw new UserFacingError('Kịch bản chưa có cảnh nào');
    enqueue(id, 'produce');
    episodeRepository.update(id, { status: 'producing' });
    episodeRepository.addEvent(id, 'Đã duyệt kịch bản, bắt đầu sản xuất');
    await appDeps.events.publish({ type: 'episode.script_approved', episodeId: id });
    return episodeService.get(id);
  },

  async approveVideo(id: string): Promise<EpisodeView> {
    const e = loadEpisode(id);
    if (e.status !== 'video_review') throw conflict('Video không ở bước duyệt video');
    episodeRepository.update(id, { status: 'published' });
    episodeRepository.addEvent(id, 'Đã duyệt video, sẵn sàng đăng');
    await appDeps.events.publish({ type: 'episode.approved', episodeId: id });
    return episodeService.get(id);
  },

  async rejectVideo(id: string, feedback: string): Promise<EpisodeView> {
    const e = loadEpisode(id);
    if (e.status !== 'video_review' && e.status !== 'published') throw conflict('Video chưa được dựng');
    episodeRepository.update(id, { status: 'script_review' });
    episodeRepository.addEvent(id, `Video bị trả lại: ${feedback}`);
    await appDeps.events.publish({ type: 'episode.rejected', episodeId: id, feedback });
    if (feedback.trim() && (await llm.isReady())) enqueue(id, 'revise_script', { feedback });
    return episodeService.get(id);
  },

  /** Re-run the last failed job (production resumes from the failed step). */
  async retry(id: string): Promise<EpisodeView> {
    const e = loadEpisode(id);
    const last = jobRepository.latest(id);
    if (!last || last.state !== 'failed') throw conflict('Không có việc nào bị lỗi để chạy lại');
    enqueue(id, last.kind, last.payload);
    if (last.kind === 'produce') episodeRepository.update(id, { status: 'producing' });
    else if (e.status === 'producing') episodeRepository.update(id, { status: 'script_review' });
    return episodeService.get(id);
  },

  /** Manual mode: the same context the agent would get, as one prompt to paste into Claude. */
  async manualPrompt(id: string, feedback?: string): Promise<string> {
    const e = loadEpisode(id);
    const ctx = await buildContext(appDeps, e);
    const compiled = compileContext(appDeps.layers, ctx);
    const task = feedback && e.scenes.length ? reviseEpisodeTask(appDeps.tools) : writeEpisodeTask(appDeps.tools);
    const input = feedback && e.scenes.length ? { current: draftFromScenes(e.title, e.scenes, e.publish ?? emptyPublishKit()), feedback } : {};
    const schema = z.toJSONSchema(scriptSchema(ctx.slots, appDeps.tools));
    return `${compiled.text}\n\n## Nhiệm vụ\n${task.prompt(input as never, ctx)}\n\nChỉ trả về MỘT khối JSON đúng JSON Schema sau, không giải thích thêm:\n${JSON.stringify(schema)}`;
  },

  /** Manual mode: import the JSON pasted back from Claude, through the same validation as AI output. */
  async importScript(id: string, text: string): Promise<EpisodeView> {
    const e = loadEpisode(id);
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
    return episodeService.get(id);
  },

  async aiRuns(id: string) {
    loadEpisode(id);
    return aiRunRepository.forEpisode(id);
  },
};
