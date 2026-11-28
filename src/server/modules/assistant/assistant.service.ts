import fs from 'node:fs/promises';
import path from 'node:path';

import { EventType } from '@ag-ui/core';

import { checkAttachment, isPicture, MAX_ATTACHMENTS, TYPE_BY_EXT, type AssistantAttachment } from '@/core/assistant/attachments';
import { ASSISTANT_RULES } from '@/core/assistant/guides';
import { resolveApproval, runAssistantTurn, EMPTY_FOCUS, type AssistantRuntime } from '@/core/assistant/loop';
import { PERMISSION_MODES, type AssistantFocus, type PermissionMode } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import type { AssistantMessage } from '@/core/ports';
import { ASSISTANT_TOOLS } from '@/server/assistant/tools';
import { assistantDir, removeAssistantMedia, resolveMedia, saveAssistantFile } from '@/server/adapters/media/media.service';
import { llm } from '@/server/adapters/llm/llm.service';
import { conflict, notFound } from '@/server/http/api-error';
import { aiRunStore } from '@/server/modules/ai-run/ai-run.repository';
import { channelService } from '@/server/modules/channel/channel.service';
import { episodeRepository } from '@/server/modules/episode/episode.repository';
import { jobRepository } from '@/server/modules/job/job.repository';
import { withUsage } from '@/server/context';
import { knowledgeRepository } from '@/server/modules/knowledge/knowledge.repository';
import { seriesRepository } from '@/server/modules/series/series.repository';
import { skillService } from '@/server/modules/skill/skill.service';

import { assistantRepository, assistantStore, type AssistantThread } from './assistant.repository';
import { eventSink, eventStream } from './assistant.stream';

const MODE_TEXT: Record<PermissionMode, string> = {
  ask: 'HỎI: mọi thao tác ghi dữ liệu đều chờ người dùng đồng ý trước khi chạy.',
  auto: 'AUTO: sửa nội dung chạy ngay; thao tác tốn tiền (tạo ảnh/giọng, viết kịch bản, sản xuất) hoặc xoá thì chờ người dùng đồng ý.',
  bypass: 'BYPASS: mọi thao tác chạy ngay, không hỏi. Vì vậy hãy cẩn thận với việc tốn tiền và xoá: chỉ làm khi người dùng đã yêu cầu rõ.',
};

/** What the model is told about the channel and where the person is, rebuilt on every step (the channel changes as it works). */
export async function buildSystemPrompt(thread: { channelId: string; mode: PermissionMode }, focus: AssistantFocus): Promise<string> {
  const c = await channelService.get(thread.channelId);
  const knowledge = await knowledgeRepository.latest(c.id);
  const skills = (await skillService.list(c.id)).map((s) => `${s.id} (${s.name})`);
  const lines: string[] = [
    `Kênh đang trò chuyện: "${c.name}" (id ${c.id}). Mô tả: ${c.description || '(chưa có)'}. Khán giả: ${c.audience}. Giọng văn: ${c.style}.`,
    `Bảng màu: ${c.palette.join(', ')}; font: ${c.font}; giọng đọc: ${c.voice}; skill mặc định: ${c.defaultSkillId ?? '(chưa chọn)'}; skill của kênh: ${skills.join(', ') || '(chưa có, cài từ market hoặc soạn mới)'}.`,
    `Thiết kế mở đầu: ${c.introDesign ? 'đã có' : 'chưa có'}; thiết kế kết: ${c.outroDesign ? 'đã có' : 'chưa có'}; logo: ${c.logoPath ? 'có' : 'không'}; avatar: ${c.avatarPath ? 'có' : 'không'}; tri thức: ${knowledge ? `v${knowledge.version}, ${knowledge.markdown.length} ký tự` : 'chưa có'}.`,
  ];
  if (knowledge) lines.push(`Đầu tri thức của kênh (dùng get_knowledge để đọc đủ):\n${knowledge.markdown.slice(0, 1500)}${knowledge.markdown.length > 1500 ? '\n…' : ''}`);

  const where: string[] = [`Trang: ${focus.route}`];
  const ep = focus.episodeId ? await episodeRepository.find(focus.episodeId) : null;
  if (ep && ep.channelId === c.id) {
    const idx = focus.sceneId ? ep.scenes.findIndex((s) => s.id === focus.sceneId) : -1;
    where.push(`Video đang mở: "${ep.title || ep.topic}" (id ${ep.id}, trạng thái ${ep.status}, ${ep.scenes.filter((s) => s.approved).length}/${ep.scenes.length} cảnh đã duyệt)`);
    if (idx >= 0) where.push(`Cảnh đang mở: cảnh ${idx + 1} (id ${focus.sceneId})`);
  }
  const series = focus.seriesId ? await seriesRepository.find(focus.seriesId) : null;
  if (series && series.channelId === c.id) where.push(`Series đang mở: "${series.name}" (id ${series.id})`);
  if (focus.skillId) where.push(`Skill đang mở: ${focus.skillId}`);
  return `${ASSISTANT_RULES}\n\nChế độ quyền hiện tại — ${MODE_TEXT[thread.mode]}\n\n${lines.join('\n')}\n\nVị trí hiện tại của người dùng:\n${where.join('\n')}`;
}

export function createAssistantRuntime(model = llm): AssistantRuntime {
  return { llm: model, store: assistantStore, tools: ASSISTANT_TOOLS, system: async (thread, focus) => await buildSystemPrompt(thread, focus), runs: aiRunStore, readAttachment: async (a) => (await fs.readFile(resolveMedia(a.path))).toString(isPicture(a.mime) ? 'base64' : 'utf8') };
}

export interface ThreadView {
  thread: AssistantThread;
  messages: AssistantMessage[];
  /** A turn is queued or running. */
  running: boolean;
  /** The person asked to stop the running turn and the worker has not ended it yet. */
  stopping: boolean;
  /** Id of the tool call waiting for the person, if any. */
  awaiting: number | null;
}

async function load(id: string): Promise<AssistantThread> {
  const t = await assistantRepository.find(id);
  if (!t) throw notFound('cuộc trò chuyện');
  return t;
}

async function viewOf(thread: AssistantThread): Promise<ThreadView> {
  // Asked before reading: a turn that finishes in between must not look done with its last message missing.
  const running = Boolean(await jobRepository.activeAssistant(thread.id));
  const messages = await assistantRepository.messages(thread.id);
  return { thread, messages, running, stopping: running && (await assistantRepository.stopRequested(thread.id)), awaiting: messages.find((m) => m.role === 'tool' && m.status === 'awaiting')?.id ?? null };
}

/** What the screen sends back about an uploaded file; everything else is read from the file itself. */
async function attached(threadId: string, files: { path: string; name: string }[]): Promise<AssistantAttachment[]> {
  if (files.length > MAX_ATTACHMENTS) throw new UserFacingError(`Mỗi tin tối đa ${MAX_ATTACHMENTS} tệp.`);
  return await Promise.all(
    files.map(async (f) => {
      const dir = assistantDir(threadId);
      const base = f.path.startsWith(dir) ? f.path.slice(dir.length) : '';
      const mime = TYPE_BY_EXT[path.extname(base)];
      const stat = /^[\w-]+\.\w+$/.test(base) && mime ? await fs.stat(resolveMedia(f.path)).catch(() => null) : null;
      if (!stat || !mime) throw new UserFacingError('Tệp đính kèm không còn. Đính kèm lại.');
      return { path: f.path, name: f.name.slice(0, 120), mime, size: stat.size };
    }),
  );
}

/** The events of the previous turn go first, so a screen that connects now never reads an old ending. */
async function enqueueTurn(threadId: string) {
  await assistantRepository.clearEvents(threadId);
  await assistantRepository.setStop(threadId, false);
  await jobRepository.insert(null, 'assistant_turn', { threadId });
}

const STOP_CHECK_MS = 500;

export const assistantService = {
  async threads(channelId: string): Promise<AssistantThread[]> {
    await channelService.get(channelId);
    return await assistantRepository.threads(channelId);
  },

  async create(channelId: string, mode: PermissionMode = 'auto'): Promise<ThreadView> {
    await channelService.get(channelId);
    return await viewOf(await assistantRepository.insertThread(channelId, mode));
  },

  async get(id: string): Promise<ThreadView> {
    return await viewOf(await load(id));
  },

  async setMode(id: string, mode: PermissionMode): Promise<ThreadView> {
    if (!PERMISSION_MODES.includes(mode)) throw new UserFacingError('Chế độ không hợp lệ');
    await load(id);
    await assistantRepository.updateThread(id, { mode });
    return await viewOf(await load(id));
  },

  async remove(id: string): Promise<void> {
    await load(id);
    if (await jobRepository.activeAssistant(id)) throw conflict('Trợ lý đang làm việc, chờ xong rồi xoá.');
    await assistantRepository.removeThread(id);
    await removeAssistantMedia(id);
  },

  /** Keeps one file for a message about to be written in this conversation. */
  async upload(id: string, file: File): Promise<AssistantAttachment> {
    await load(id);
    const data = Buffer.from(await file.arrayBuffer());
    const checked = checkAttachment(data, file.name);
    if ('error' in checked) throw new UserFacingError(checked.error);
    const rel = await saveAssistantFile(id, data, checked.ext);
    return { path: rel, name: file.name.slice(0, 120), mime: TYPE_BY_EXT[checked.ext]!, size: data.length };
  },

  /** The person writes. A request still waiting for approval is dropped (they chose to say something else instead). */
  async send(id: string, text: string, focus: Partial<AssistantFocus>, files: { path: string; name: string }[] = []): Promise<ThreadView> {
    const thread = await load(id);
    if (!text.trim() && !files.length) throw new UserFacingError('Gõ nội dung trước nhé');
    const attachments = await attached(id, files);
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt để chọn nhà cung cấp và nhập API key.');
    if (await jobRepository.activeAssistant(id)) throw conflict('Trợ lý đang làm việc, chờ xong rồi gửi tiếp.');
    const rt = createAssistantRuntime();
    for (const m of await assistantRepository.messages(id)) if (m.role === 'tool' && m.status === 'awaiting') await resolveApproval(rt, m.id, id, false);
    await assistantRepository.append(id, { role: 'user', content: text.trim(), toolCalls: [], toolCallId: null, toolName: null, status: 'done', summary: '', data: attachments.length ? { attachments } : null, focus: { ...EMPTY_FOCUS, ...focus } });
    if (!thread.title) await assistantRepository.updateThread(id, { title: (text.trim() || attachments[0]!.name).slice(0, 60) });
    await enqueueTurn(id);
    return await viewOf(await load(id));
  },

  /** The person's answer to an approval card; the turn then continues in the worker. */
  async decide(id: string, messageId: number, approve: boolean): Promise<ThreadView> {
    await load(id);
    if (await jobRepository.activeAssistant(id)) throw conflict('Trợ lý đang làm việc, chờ xong rồi trả lời.');
    await resolveApproval(createAssistantRuntime(), messageId, id, approve);
    await enqueueTurn(id);
    return await viewOf(await load(id));
  },

  /** The person presses stop: the worker ends the turn, keeping what was written. */
  async stop(id: string): Promise<ThreadView> {
    await load(id);
    if (await jobRepository.activeAssistant(id)) await assistantRepository.setStop(id, true);
    return await viewOf(await load(id));
  },

  /** The live events of the running turn after a position, as server-sent events. */
  async events(id: string, after: number, signal: AbortSignal): Promise<Response> {
    await load(id);
    return eventStream(id, after, signal);
  },

  /** Runs in the worker. A failure becomes a message in the chat instead of a silent failed job. */
  async runTurn(id: string): Promise<void> {
    const sink = eventSink(id);
    const stop = new AbortController();
    const stopped = async () => {
      if (!stop.signal.aborted && (await assistantRepository.stopRequested(id))) stop.abort();
      return stop.signal.aborted;
    };
    const watch = setInterval(() => void stopped().catch(() => {}), STOP_CHECK_MS);
    try {
      const thread = await assistantRepository.find(id);
      const rt = { ...createAssistantRuntime(), emit: sink.emit, signal: stop.signal, stopped };
      await withUsage({ threadId: id, channelId: thread?.channelId, purpose: 'assistant' }, () => runAssistantTurn(rt, id));
    } catch (e) {
      const text = e instanceof UserFacingError ? e.message : 'Trợ lý gặp lỗi. Thử lại hoặc xem nhật ký worker.';
      await assistantRepository.append(id, { role: 'assistant', content: `⚠️ ${text}`, toolCalls: [], toolCallId: null, toolName: null, status: 'error', summary: '', data: null, focus: null });
      sink.emit({ type: EventType.RUN_ERROR, message: text });
      throw e;
    } finally {
      clearInterval(watch);
      await sink.close();
    }
  },
};
