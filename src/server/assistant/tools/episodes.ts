import { z } from 'zod';

import { defineTool, type ToolContext } from '@/core/assistant/tool';
import { FORMAT_IDS, VOICE_IDS, type Format, type VoiceId } from '@/core/domain';
import { UserFacingError } from '@/core/domain/errors';
import { makePlan } from '@/core/scenes/make-plan';
import { episodeService } from '@/server/modules/episode/episode.service';
import type { EpisodeView } from '@/server/modules/episode/episode.types';
import { usageService } from '@/server/modules/usage/usage.service';
import { toolCatalog } from '@/tools/registry';

import { asJson, describeEpisode, ownEpisode } from './util';

const Formats = z.array(z.enum(FORMAT_IDS as [Format, ...Format[]])).min(1);
const label = async (ctx: ToolContext, id: string) => {
  try {
    const e = (await ownEpisode(ctx, id)).episode;
    return `“${e.title || e.topic}”`;
  } catch {
    return id;
  }
};

/** The script as the save endpoint wants it, so a single change keeps ids, assets and approvals of the other scenes. */
function scriptInput(v: EpisodeView, scenes = v.episode.scenes) {
  const e = v.episode;
  return { title: e.title, publish: e.publish, scenes: scenes.map((s) => ({ id: s.id, slotId: s.slotId, block: s.block, locked: s.locked, narration: s.narration, props: s.props })) };
}

export const listEpisodes = defineTool({
  name: 'list_episodes',
  description: 'Các video của kênh (có thể lọc theo series hoặc trạng thái): id, tên, trạng thái, tiến độ duyệt cảnh.',
  risk: 'read',
  schema: z.object({ seriesId: z.string().optional(), status: z.enum(['planned', 'draft', 'script_review', 'producing', 'video_review', 'published']).optional() }),
  summarize: () => 'Xem các video của kênh',
  async run({ seriesId, status }, ctx) {
    const list = (await episodeService.list({ channelId: ctx.channelId, seriesId })).filter((v) => !status || v.episode.status === status);
    return { ok: true, message: asJson(list.slice(0, 40).map((v) => ({ id: v.episode.id, number: v.episode.number, seriesId: v.episode.seriesId, topic: v.episode.topic, title: v.episode.title, status: v.episode.status, approved: `${v.episode.scenes.filter((s) => s.approved).length}/${v.episode.scenes.length}`, job: v.job?.state ?? null }))) };
  },
});

export const getEpisode = defineTool({
  name: 'get_episode',
  description: 'Xem chi tiết một video: kịch bản từng cảnh (id, khối, lời đọc, thuộc tính), ảnh/giọng/duyệt của từng cảnh, việc đang chạy, lỗi kiểm tra tự động.',
  risk: 'read',
  schema: z.object({ episodeId: z.string() }),
  summarize: (a) => `Xem video ${a.episodeId}`,
  async run({ episodeId }, ctx) {
    return { ok: true, message: asJson(describeEpisode(await ownEpisode(ctx, episodeId)), 12000) };
  },
});

export const createEpisode = defineTool({
  name: 'create_episode',
  description: 'Tạo một video mới (chưa viết kịch bản). skillId là skill của kênh (bỏ trống thì dùng skill mặc định của kênh); seriesId nếu là một tập của series (dùng skill của series). Sau đó gọi write_script để AI viết kịch bản.',
  risk: 'write',
  schema: z.object({
    topic: z.string().min(3).max(300),
    goal: z.string().max(300).default(''),
    notes: z.string().max(1000).default(''),
    skillId: z.string().optional(),
    seriesId: z.string().optional(),
    formats: Formats.default(['landscape']),
    voice: z.enum(VOICE_IDS as [VoiceId, ...VoiceId[]]).optional(),
    sceneCount: z.number().int().min(2).max(20).nullable().default(null),
  }),
  summarize: (a) => `Tạo video “${a.topic}”`,
  async run(a, ctx) {
    const v = await episodeService.create({ channelId: ctx.channelId, seriesId: a.seriesId ?? null, skillId: a.skillId, topic: a.topic, goal: a.goal, notes: a.notes, formats: a.formats, voice: a.voice, music: true, sceneCount: a.sceneCount, planOnly: true });
    return { ok: true, message: `Đã tạo video "${v.episode.topic}" (id ${v.episode.id}, skill ${v.episode.skillId}). Chưa có kịch bản: gọi write_script để AI viết.` };
  },
});

export const writeScript = defineTool({
  name: 'write_script',
  description: 'Giao cho AI viết (hoặc viết lại) kịch bản của một video theo skill, tri thức và giọng văn của kênh (ba bước: dựng mạch chuyện, viết cảnh theo mạch, làm mượt lời đọc; tốn ba lượt gọi AI, chạy nền 30-90 giây). Viết lại cả kịch bản thay các cảnh bằng cảnh mới nên ẢNH, GIỌNG và TRẠNG THÁI DUYỆT của cảnh cũ mất (chỉ cảnh giống hệt được giữ). Nếu video đã có ảnh/giọng/cảnh đã duyệt, chỉ gọi khi người dùng xác nhận rõ muốn làm lại từ đầu (discardWork=true); thay đổi một phần thì dùng revise_script hoặc edit_scene.',
  risk: 'paid',
  schema: z.object({ episodeId: z.string(), discardWork: z.boolean().default(false).describe('true khi người dùng đã xác nhận bỏ ảnh/giọng/duyệt đang có để viết lại từ đầu') }),
  summarize: async (a, ctx) => `AI viết kịch bản cho video ${await label(ctx, a.episodeId)}`,
  async run({ episodeId, discardWork }, ctx) {
    const v = await ownEpisode(ctx, episodeId);
    const done = v.episode.scenes.filter((s) => s.approved || s.assets.imagePath || s.assets.voicePath).length;
    if (done && !discardWork) {
      return { ok: false, message: `Video này đã có công sức ở ${done}/${v.episode.scenes.length} cảnh (ảnh, giọng hoặc đã duyệt). Viết lại cả kịch bản sẽ làm mất chúng. Hỏi người dùng có chắc muốn làm lại từ đầu không; nếu chỉ muốn đổi một phần thì dùng revise_script (giữ cảnh không đổi) hoặc edit_scene. Chỉ gọi lại với discardWork=true sau khi họ xác nhận.` };
    }
    await episodeService.requestScript(episodeId);
    return { ok: true, message: 'Đã giao worker viết kịch bản. Dùng get_episode sau ít giây để xem kết quả.' };
  },
});

export const reviseScript = defineTool({
  name: 'revise_script',
  description: 'Nhờ AI sửa kịch bản hiện có theo một yêu cầu (VD "ngắn gọn hơn", "thêm 2 cảnh về con mèo"). Dùng khi yêu cầu ảnh hưởng nhiều cảnh; sửa một cảnh cụ thể thì dùng edit_scene. Tốn lượt gọi AI, chạy nền.',
  risk: 'paid',
  schema: z.object({ episodeId: z.string(), feedback: z.string().min(3).max(600) }),
  summarize: async (a, ctx) => `AI sửa kịch bản ${await label(ctx, a.episodeId)}: ${a.feedback}`,
  async run({ episodeId, feedback }, ctx) {
    await ownEpisode(ctx, episodeId);
    await episodeService.revise(episodeId, feedback);
    return { ok: true, message: 'Đã giao worker sửa kịch bản. Cảnh không đổi giữ nguyên ảnh, giọng và trạng thái duyệt.' };
  },
});

export const editScene = defineTool({
  name: 'edit_scene',
  description: 'Sửa MỘT cảnh của video: lời đọc (narration), các thuộc tính của khối (props, chỉ truyền thuộc tính cần đổi; xem get_episode và list_blocks) và/hoặc ĐỔI LOẠI CẢNH sang khối khác mà skill cho phép (block, ví dụ từ remotion/picture sang remotion/counter; khi đổi loại hãy điền đủ props của khối mới, thuộc tính bỏ trống lấy mặc định của khối mới). Sửa xong cảnh mất trạng thái duyệt, ảnh/giọng cũ thành lỗi thời nếu mô tả ảnh hoặc lời đọc đổi. Không sửa được cảnh khoá của series.',
  risk: 'write',
  schema: z.object({ episodeId: z.string(), sceneId: z.string(), narration: z.string().max(600).optional(), props: z.record(z.string(), z.unknown()).optional(), block: z.string().optional().describe('Mã khối để đổi loại cảnh, ví dụ "remotion/counter"') }),
  summarize: async (a, ctx) => `Sửa cảnh của video ${await label(ctx, a.episodeId)}: ${[a.block && `đổi loại thành @${a.block}`, a.narration !== undefined && 'lời đọc', a.props && Object.keys(a.props).join(', ')].filter(Boolean).join(' + ')}`,
  async run({ episodeId, sceneId, narration, props, block }, ctx) {
    const v = await ownEpisode(ctx, episodeId);
    const scene = v.episode.scenes.find((s) => s.id === sceneId);
    if (!scene) throw new UserFacingError('Không tìm thấy cảnh này trong video.');
    if (scene.locked) throw new UserFacingError('Cảnh này bị khoá theo series, không sửa được.');
    // Changing the type starts from the new block's own defaults (the old block's props mean nothing to it).
    const target = block && block !== scene.block ? toolCatalog.block(block) : undefined;
    if (block && block !== scene.block && !target) throw new UserFacingError(`Khối @${block} không tồn tại. Xem list_blocks.`);
    const scenes = v.episode.scenes.map((s) => (s.id === sceneId ? { ...s, ...(target ? { block: target.ref } : {}), narration: narration ?? s.narration, props: target ? { ...(target.defaults as Record<string, unknown>), ...(props ?? {}) } : { ...s.props, ...(props ?? {}) } } : s));
    const after = await episodeService.saveScript(episodeId, scriptInput(v, scenes));
    return { ok: true, message: `Đã sửa cảnh ${after.episode.scenes.findIndex((s) => s.id === sceneId) + 1}. Cần tạo lại ảnh/giọng nếu nội dung liên quan đã đổi, rồi duyệt lại.` };
  },
});

export const addScene = defineTool({
  name: 'add_scene',
  description: 'Thêm một cảnh vào video. block là khối được khe cho phép (xem get_episode/list_blocks), props là các thuộc tính của khối (thuộc tính bỏ trống lấy mặc định). Thêm sau cảnh afterSceneId, hoặc cuối khe slotId.',
  risk: 'write',
  schema: z.object({ episodeId: z.string(), block: z.string(), narration: z.string().min(1).max(600), props: z.record(z.string(), z.unknown()).default({}), afterSceneId: z.string().optional(), slotId: z.string().optional() }),
  summarize: async (a, ctx) => `Thêm cảnh ${a.block} vào video ${await label(ctx, a.episodeId)}`,
  async run({ episodeId, block, narration, props, afterSceneId, slotId }, ctx) {
    const v = await ownEpisode(ctx, episodeId);
    const scenes = [...v.episode.scenes];
    const after = afterSceneId ? scenes.findIndex((s) => s.id === afterSceneId) : -1;
    if (afterSceneId && after < 0) throw new UserFacingError('Không tìm thấy cảnh afterSceneId.');
    const slot = v.slots.find((x) => x.id === (slotId ?? (after >= 0 ? scenes[after]!.slotId : undefined))) ?? v.slots.find((x) => x.fill === 'ai' && x.blocks.includes(toolCatalog.block(block)?.ref ?? block));
    if (!slot || slot.fill !== 'ai') throw new UserFacingError('Không có khe nào cho phép thêm cảnh với khối này.');
    const resolved = toolCatalog.block(block);
    if (!resolved || !slot.blocks.includes(resolved.ref)) throw new UserFacingError(`Khe "${slot.name}" chỉ cho dùng: ${slot.blocks.join(', ')}.`);
    const fresh = { id: `n${crypto.randomUUID().replace(/-/g, '').slice(0, 11)}`, slotId: slot.id, block: resolved.ref, locked: false, narration, props: { ...(resolved.defaults as Record<string, unknown>), ...props }, approved: false, assets: { imagePath: null, imageHash: null, voicePath: null, voiceSeconds: null, voiceHash: null } };
    const at = after >= 0 ? after + 1 : scenes.map((s) => s.slotId).lastIndexOf(slot.id) + 1 || scenes.length;
    scenes.splice(at, 0, fresh);
    const saved = await episodeService.saveScript(episodeId, scriptInput(v, scenes));
    return { ok: true, message: `Đã thêm cảnh ${saved.episode.scenes.findIndex((s) => s.id === fresh.id) + 1} (id ${fresh.id}). Tạo ảnh/giọng rồi duyệt.` };
  },
});

export const removeScene = defineTool({
  name: 'remove_scene',
  description: 'Xoá một cảnh khỏi video (không xoá được cảnh khoá của series).',
  risk: 'destructive',
  schema: z.object({ episodeId: z.string(), sceneId: z.string() }),
  summarize: async (a, ctx) => `Xoá một cảnh của video ${await label(ctx, a.episodeId)}`,
  async run({ episodeId, sceneId }, ctx) {
    const v = await ownEpisode(ctx, episodeId);
    const scene = v.episode.scenes.find((s) => s.id === sceneId);
    if (!scene) throw new UserFacingError('Không tìm thấy cảnh này.');
    if (scene.locked) throw new UserFacingError('Cảnh này bị khoá theo series, không xoá được.');
    await episodeService.saveScript(episodeId, scriptInput(v, v.episode.scenes.filter((s) => s.id !== sceneId)));
    return { ok: true, message: 'Đã xoá cảnh.' };
  },
});

export const setEpisodeOptions = defineTool({
  name: 'set_episode_options',
  description: 'Đổi thiết lập của video: tên/chủ đề/mục tiêu (trước khi duyệt), giọng đọc, khung hình xuất ra, nhạc nền, tự tạo ảnh/giọng khi AI viết xong (autoImages/autoVoice). Đổi skill của video lẻ thì truyền skillId (xoá kịch bản và viết lại).',
  risk: 'write',
  schema: z.object({
    episodeId: z.string(),
    topic: z.string().min(3).max(300).optional(),
    goal: z.string().max(300).optional(),
    voice: z.enum(VOICE_IDS as [VoiceId, ...VoiceId[]]).optional(),
    formats: Formats.optional(),
    music: z.boolean().optional(),
    autoImages: z.boolean().optional(),
    autoVoice: z.boolean().optional(),
    skillId: z.string().optional(),
  }),
  summarize: async (a, ctx) => `Đổi thiết lập video ${await label(ctx, a.episodeId)}: ${Object.keys(a).filter((k) => k !== 'episodeId' && (a as Record<string, unknown>)[k] !== undefined).join(', ')}`,
  async run({ episodeId, ...patch }, ctx) {
    await ownEpisode(ctx, episodeId);
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await episodeService.updateOptions(episodeId, defined);
    return { ok: true, message: `Đã đổi: ${Object.keys(defined).join(', ')}.${defined.voice ? ' Giọng đã tạo trước đó không còn khớp, cần tạo lại và duyệt lại.' : ''}${defined.skillId ? ' Kịch bản được viết lại theo skill mới.' : ''}` };
  },
});

export const generateSceneAssets = defineTool({
  name: 'generate_scene_assets',
  description: 'Tạo ảnh AI và/hoặc giọng đọc cho các cảnh (sceneIds; bỏ trống = mọi cảnh). Chỉ tạo phần còn thiếu hoặc lỗi thời. LUÔN gọi MỘT lần cho cả video (không gọi từng cảnh) và báo chi phí ước tính (estimate_cost) trước. Tốn tiền ảnh/giọng, chạy nền. Cảnh được tạo lại sẽ mất trạng thái duyệt.',
  risk: 'paid',
  schema: z.object({ episodeId: z.string(), sceneIds: z.array(z.string()).nullable().default(null), image: z.boolean().default(true), voice: z.boolean().default(true), force: z.boolean().default(false).describe('true = làm lại cả khi ảnh/giọng hiện tại vẫn khớp cảnh (khi người dùng bảo tạo lại, đổi ảnh khác)') }),
  summarize: async (a, ctx) => `${a.force ? 'Làm lại' : 'Tạo'} ${[a.image && 'ảnh', a.voice && 'giọng'].filter(Boolean).join(' và ')} cho ${a.sceneIds ? `${a.sceneIds.length} cảnh` : 'mọi cảnh'} của video ${await label(ctx, a.episodeId)}`,
  async run({ episodeId, sceneIds, image, voice, force }, ctx) {
    await ownEpisode(ctx, episodeId);
    await episodeService.requestAssets(episodeId, { sceneIds, image, voice, force });
    return { ok: true, message: 'Đã giao worker tạo. Dùng get_episode để kiểm tra khi cần (cột image/voice của từng cảnh).' };
  },
});

export const estimateCost = defineTool({
  name: 'estimate_cost',
  description: 'Ước tính chi phí để tạo phần ảnh và giọng còn thiếu của video (không gọi AI, không tốn tiền): số ảnh, số giây giọng, USD, VND. Dùng để báo giá cho người dùng TRƯỚC khi xin đồng ý tạo.',
  risk: 'read',
  schema: z.object({ episodeId: z.string() }),
  summarize: async (a, ctx) => `Ước tính chi phí ảnh và giọng của video ${await label(ctx, a.episodeId)}`,
  async run({ episodeId }, ctx) {
    await ownEpisode(ctx, episodeId);
    const v = await episodeService.get(episodeId);
    const plan = makePlan(v.episode.scenes, v.assets);
    if (plan.empty) return { ok: true, message: 'Mọi cảnh đã đủ ảnh và giọng, không cần tạo thêm, chi phí $0.' };
    const e = await usageService.estimate({ images: plan.images, texts: plan.voiceTexts, voice: v.episode.voice });
    const money = e.usd === null ? 'chưa có giá trong bảng giá nên chưa ước tính được tiền' : e.usd === 0 ? '$0 (miễn phí)' : `khoảng $${e.usd.toFixed(3)} (≈ ${Math.round(e.usd * e.fxUsdVnd).toLocaleString('vi-VN')} ₫)`;
    return { ok: true, message: `Còn thiếu ${plan.images} ảnh và ${plan.voices} giọng (~${e.voiceSeconds} giây). Chi phí: ${money}. ${plan.approvable.length} cảnh đã đủ nhưng chưa duyệt.` };
  },
});

export const approveScenes = defineTool({
  name: 'approve_scenes',
  description: 'Duyệt (approved=true) hoặc bỏ duyệt các cảnh (sceneIds; bỏ trống = mọi cảnh). Chỉ duyệt được cảnh đã có ảnh và giọng khớp nội dung hiện tại. Khi mọi cảnh đã duyệt mới sản xuất được.',
  risk: 'write',
  schema: z.object({ episodeId: z.string(), sceneIds: z.array(z.string()).nullable().default(null), approved: z.boolean().default(true) }),
  summarize: async (a, ctx) => `${a.approved ? 'Duyệt' : 'Bỏ duyệt'} ${a.sceneIds ? `${a.sceneIds.length} cảnh` : 'mọi cảnh'} của video ${await label(ctx, a.episodeId)}`,
  async run({ episodeId, sceneIds, approved }, ctx) {
    await ownEpisode(ctx, episodeId);
    const v = await episodeService.setApproval(episodeId, { sceneIds, approved });
    return { ok: true, message: `Đã ${approved ? 'duyệt' : 'bỏ duyệt'}. Hiện ${v.episode.scenes.filter((s) => s.approved).length}/${v.episode.scenes.length} cảnh đã duyệt.` };
  },
});

export const produceVideo = defineTool({
  name: 'produce_video',
  description: 'Sản xuất video: ghép các cảnh đã duyệt (ảnh, giọng, nhạc) thành video hoàn chỉnh. Chỉ chạy khi MỌI cảnh đã duyệt. Chạy nền vài phút.',
  risk: 'paid',
  schema: z.object({ episodeId: z.string() }),
  summarize: async (a, ctx) => `Sản xuất (ghép) video ${await label(ctx, a.episodeId)}`,
  async run({ episodeId }, ctx) {
    await ownEpisode(ctx, episodeId);
    await episodeService.approveScript(episodeId);
    return { ok: true, message: 'Đã bắt đầu sản xuất. Video sẽ chờ duyệt ở bước Sản xuất khi xong.' };
  },
});

export const deleteEpisode = defineTool({
  name: 'delete_episode',
  description: 'Xoá hẳn một video cùng ảnh, giọng và bản dựng của nó.',
  risk: 'destructive',
  schema: z.object({ episodeId: z.string() }),
  summarize: async (a, ctx) => `Xoá video ${await label(ctx, a.episodeId)}`,
  async run({ episodeId }, ctx) {
    await ownEpisode(ctx, episodeId);
    await episodeService.remove(episodeId);
    return { ok: true, message: 'Đã xoá video.' };
  },
});

export const episodeTools = [listEpisodes, getEpisode, createEpisode, writeScript, reviseScript, editScene, addScene, removeScene, setEpisodeOptions, estimateCost, generateSceneAssets, approveScenes, produceVideo, deleteEpisode];
