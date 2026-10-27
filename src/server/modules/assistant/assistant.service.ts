import { ASSISTANT_RULES } from '@/core/assistant/guides';
import { resolveApproval, runAssistantTurn, EMPTY_FOCUS, type AssistantRuntime } from '@/core/assistant/loop';
import { PERMISSION_MODES, type AssistantFocus, type PermissionMode } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import type { AssistantMessage } from '@/core/ports';
import { ASSISTANT_TOOLS } from '@/server/assistant/tools';
import { llm } from '@/server/adapters/llm/llm.service';
import { conflict, notFound } from '@/server/http/api-error';
import { aiRunStore } from '@/server/modules/ai-run/ai-run.repository';
import { channelService } from '@/server/modules/channel/channel.service';
import { episodeRepository } from '@/server/modules/episode/episode.repository';
import { jobRepository } from '@/server/modules/job/job.repository';
import { withUsageScope } from '@/server/modules/usage/usage.scope';
import { knowledgeRepository } from '@/server/modules/knowledge/knowledge.repository';
import { seriesRepository } from '@/server/modules/series/series.repository';
import { skillService } from '@/server/modules/skill/skill.service';

import { assistantRepository, assistantStore, type AssistantThread } from './assistant.repository';

const MODE_TEXT: Record<PermissionMode, string> = {
  ask: 'HỎI: mọi thao tác ghi dữ liệu đều chờ người dùng đồng ý trước khi chạy.',
  auto: 'AUTO: sửa nội dung chạy ngay; thao tác tốn tiền (tạo ảnh/giọng, viết kịch bản, sản xuất) hoặc xoá thì chờ người dùng đồng ý.',
  bypass: 'BYPASS: mọi thao tác chạy ngay, không hỏi. Vì vậy hãy cẩn thận với việc tốn tiền và xoá: chỉ làm khi người dùng đã yêu cầu rõ.',
};

/** What the model is told about the channel and where the person is, rebuilt on every step (the channel changes as it works). */
export async function buildSystemPrompt(thread: { channelId: string; mode: PermissionMode }, focus: AssistantFocus): Promise<string> {
  const c = await channelService.get(thread.channelId);
  const knowledge = knowledgeRepository.latest(c.id);
  const skills = (await skillService.list(c.id)).map((s) => `${s.id} (${s.name})`);
  const lines: string[] = [
    `Kênh đang trò chuyện: "${c.name}" (id ${c.id}). Mô tả: ${c.description || '(chưa có)'}. Khán giả: ${c.audience}. Giọng văn: ${c.style}.`,
    `Bảng màu: ${c.palette.join(', ')}; font: ${c.font}; giọng đọc: ${c.voice}; skill mặc định: ${c.defaultSkillId ?? '(chưa chọn)'}; skill của kênh: ${skills.join(', ') || '(chưa có, cài từ market hoặc soạn mới)'}.`,
    `Thiết kế mở đầu: ${c.introDesign ? 'đã có' : 'chưa có'}; thiết kế kết: ${c.outroDesign ? 'đã có' : 'chưa có'}; logo: ${c.logoPath ? 'có' : 'không'}; avatar: ${c.avatarPath ? 'có' : 'không'}; tri thức: ${knowledge ? `v${knowledge.version}, ${knowledge.markdown.length} ký tự` : 'chưa có'}.`,
  ];
  if (knowledge) lines.push(`Đầu tri thức của kênh (dùng get_knowledge để đọc đủ):\n${knowledge.markdown.slice(0, 1500)}${knowledge.markdown.length > 1500 ? '\n…' : ''}`);

  const where: string[] = [`Trang: ${focus.route}`];
  const ep = focus.episodeId ? episodeRepository.find(focus.episodeId) : null;
  if (ep && ep.channelId === c.id) {
    const idx = focus.sceneId ? ep.scenes.findIndex((s) => s.id === focus.sceneId) : -1;
    where.push(`Video đang mở: "${ep.title || ep.topic}" (id ${ep.id}, trạng thái ${ep.status}, ${ep.scenes.filter((s) => s.approved).length}/${ep.scenes.length} cảnh đã duyệt)`);
    if (idx >= 0) where.push(`Cảnh đang mở: cảnh ${idx + 1} (id ${focus.sceneId})`);
  }
  const series = focus.seriesId ? seriesRepository.find(focus.seriesId) : null;
  if (series && series.channelId === c.id) where.push(`Series đang mở: "${series.name}" (id ${series.id})`);
  if (focus.skillId) where.push(`Skill đang mở: ${focus.skillId}`);
  return `${ASSISTANT_RULES}\n\nChế độ quyền hiện tại — ${MODE_TEXT[thread.mode]}\n\n${lines.join('\n')}\n\nVị trí hiện tại của người dùng:\n${where.join('\n')}`;
}

export function createAssistantRuntime(model = llm): AssistantRuntime {
  return { llm: model, store: assistantStore, tools: ASSISTANT_TOOLS, system: (thread, focus) => buildSystemPrompt(thread, focus), runs: aiRunStore };
}

export interface ThreadView {
  thread: AssistantThread;
  messages: AssistantMessage[];
  /** A turn is queued or running. */
  running: boolean;
  /** Id of the tool call waiting for the person, if any. */
  awaiting: number | null;
}

function load(id: string): AssistantThread {
  const t = assistantRepository.find(id);
  if (!t) throw notFound('cuộc trò chuyện');
  return t;
}

function viewOf(thread: AssistantThread): ThreadView {
  const messages = assistantRepository.messages(thread.id);
  return { thread, messages, running: Boolean(jobRepository.activeAssistant(thread.id)), awaiting: messages.find((m) => m.role === 'tool' && m.status === 'awaiting')?.id ?? null };
}

const enqueueTurn = (threadId: string) => jobRepository.insert(null, 'assistant_turn', { threadId });

export const assistantService = {
  async threads(channelId: string): Promise<AssistantThread[]> {
    await channelService.get(channelId);
    return assistantRepository.threads(channelId);
  },

  async create(channelId: string, mode: PermissionMode = 'auto'): Promise<ThreadView> {
    await channelService.get(channelId);
    return viewOf(assistantRepository.insertThread(channelId, mode));
  },

  async get(id: string): Promise<ThreadView> {
    return viewOf(load(id));
  },

  async setMode(id: string, mode: PermissionMode): Promise<ThreadView> {
    if (!PERMISSION_MODES.includes(mode)) throw new UserFacingError('Chế độ không hợp lệ');
    load(id);
    assistantRepository.updateThread(id, { mode });
    return viewOf(load(id));
  },

  async remove(id: string): Promise<void> {
    load(id);
    if (jobRepository.activeAssistant(id)) throw conflict('Trợ lý đang làm việc, chờ xong rồi xoá.');
    assistantRepository.removeThread(id);
  },

  /** The person writes. A request still waiting for approval is dropped (they chose to say something else instead). */
  async send(id: string, text: string, focus: Partial<AssistantFocus>): Promise<ThreadView> {
    const thread = load(id);
    if (!text.trim()) throw new UserFacingError('Gõ nội dung trước nhé');
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt để chọn nhà cung cấp và nhập API key.');
    if (jobRepository.activeAssistant(id)) throw conflict('Trợ lý đang làm việc, chờ xong rồi gửi tiếp.');
    const rt = createAssistantRuntime();
    for (const m of assistantRepository.messages(id)) if (m.role === 'tool' && m.status === 'awaiting') await resolveApproval(rt, m.id, id, false);
    assistantRepository.append(id, { role: 'user', content: text.trim(), toolCalls: [], toolCallId: null, toolName: null, status: 'done', summary: '', data: null, focus: { ...EMPTY_FOCUS, ...focus } });
    if (!thread.title) assistantRepository.updateThread(id, { title: text.trim().slice(0, 60) });
    enqueueTurn(id);
    return viewOf(load(id));
  },

  /** The person's answer to an approval card; the turn then continues in the worker. */
  async decide(id: string, messageId: number, approve: boolean): Promise<ThreadView> {
    load(id);
    if (jobRepository.activeAssistant(id)) throw conflict('Trợ lý đang làm việc, chờ xong rồi trả lời.');
    await resolveApproval(createAssistantRuntime(), messageId, id, approve);
    enqueueTurn(id);
    return viewOf(load(id));
  },

  /** Runs in the worker. A failure becomes a message in the chat instead of a silent failed job. */
  async runTurn(id: string): Promise<void> {
    try {
      const thread = assistantRepository.find(id);
      await withUsageScope({ threadId: id, channelId: thread?.channelId, purpose: 'assistant' }, () => runAssistantTurn(createAssistantRuntime(), id));
    } catch (e) {
      const text = e instanceof UserFacingError ? e.message : 'Trợ lý gặp lỗi. Thử lại hoặc xem nhật ký worker.';
      assistantRepository.append(id, { role: 'assistant', content: `⚠️ ${text}`, toolCalls: [], toolCallId: null, toolName: null, status: 'error', summary: '', data: null, focus: null });
      throw e;
    }
  },
};
