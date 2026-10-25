import { UserFacingError, type Job, type JobKind, type Project, type Scene } from '@/core/domain';
import { newId, skillTools } from '@/core/pipeline';
import type { ProjectStore } from '@/core/ports';
import { briefPrompt, extractJson, manualPrompt, revisePrompt, systemPrompt, validateScript } from '@/core/script';
import { cleanProps } from '@/core/tool';
import { now } from '@/server/db';
import { conflict, notFound } from '@/server/http/api-error';
import { channelService } from '@/server/modules/channel/channel.service';
import { jobRepository } from '@/server/modules/job/job.repository';
import { llm } from '@/server/modules/llm/llm.service';
import { mediaUrl, removeProjectMedia } from '@/server/modules/media/media.service';
import { skillStore } from '@/server/modules/skill/skill.service';
import { toolCatalog } from '@/tools';

import { projectRepository } from './project.repository';
import type { CreateProjectInput, ProjectOptionsInput, ProjectView, SaveScriptInput } from './project.types';

function load(id: string): Project {
  const p = projectRepository.find(id);
  if (!p) throw notFound('video');
  return p;
}

/** The job worth showing: the active one, or the latest one if it failed. */
function visibleJob(projectId: string): Job | null {
  const active = jobRepository.active(projectId);
  if (active) return active;
  const latest = jobRepository.latest(projectId);
  return latest?.state === 'failed' ? latest : null;
}

function enqueue(projectId: string, kind: JobKind, payload: Record<string, unknown> = {}): Job {
  if (jobRepository.active(projectId)) throw conflict('Video đang có việc chạy, chờ xong rồi thử lại.');
  const job = jobRepository.insert(projectId, kind, payload);
  projectRepository.touch(projectId);
  return job;
}

function view(p: Project): ProjectView {
  return {
    project: p,
    job: visibleJob(p.id),
    renders: projectRepository.renders(p.id).map((r) => ({ ...r, url: mediaUrl(r.filePath) })),
    events: projectRepository.events(p.id),
  };
}

async function toolsFor(p: Project) {
  return skillTools(await skillStore.get(p.skillId), { tools: toolCatalog });
}

export const projectService = {
  async list(): Promise<ProjectView[]> {
    return projectRepository.list().map(view);
  },

  async get(id: string): Promise<ProjectView> {
    return view(load(id));
  },

  async create(input: CreateProjectInput): Promise<ProjectView> {
    await channelService.get(input.channelId);
    await toolsFor({ skillId: input.skillId } as Project);
    const ts = now();
    const id = newId();
    projectRepository.insert({ id, ...input, status: 'draft', createdAt: ts, updatedAt: ts });
    projectRepository.addEvent(id, `Tạo video: ${input.idea}`);
    if (await llm.isReady()) enqueue(id, 'write_script');
    return view(load(id));
  },

  async remove(id: string) {
    load(id);
    if (jobRepository.active(id)?.state === 'running') throw conflict('Video đang được xử lý, chờ xong rồi xoá.');
    projectRepository.remove(id);
    await removeProjectMedia(id);
  },

  async updateOptions(id: string, input: ProjectOptionsInput): Promise<ProjectView> {
    load(id);
    projectRepository.update(id, input);
    return view(load(id));
  },

  /** Save the person's edits. Scenes are editable before production; the publish kit any time. */
  async saveScript(id: string, input: SaveScriptInput): Promise<ProjectView> {
    const p = load(id);
    if (jobRepository.active(id)) throw conflict('Video đang có việc chạy, chờ xong rồi lưu.');
    const editable = p.status === 'draft' || p.status === 'script_review';
    const tools = await toolsFor(p);
    const scenesChanged = JSON.stringify(input.scenes.map(({ tool, narration, props }) => ({ tool, narration, props }))) !== JSON.stringify(p.scenes.map(({ tool, narration, props }) => ({ tool, narration, props })));
    if (scenesChanged && !editable) throw conflict('Kịch bản đã được duyệt. Gửi yêu cầu sửa để quay lại bước kịch bản.');
    const scenes: Scene[] = input.scenes.map((s) => {
      const tool = tools.find((t) => t.id === s.tool);
      if (!tool) throw new UserFacingError(`Skill của video không dùng tool @${s.tool}`);
      return { id: s.id ?? newId(), tool: s.tool, narration: s.narration.trim(), props: cleanProps(tool, s.props) };
    });
    projectRepository.update(id, {
      title: input.title,
      publish: input.publish,
      ...(scenesChanged ? { scenes } : {}),
      ...(p.status === 'draft' && scenes.length ? { status: 'script_review' as const } : {}),
    });
    projectRepository.addEvent(id, scenesChanged ? 'Đã lưu chỉnh sửa kịch bản' : 'Đã lưu nội dung đăng bài');
    return view(load(id));
  },

  async requestScript(id: string): Promise<ProjectView> {
    load(id);
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt, hoặc dùng chế độ dán kịch bản.');
    enqueue(id, 'write_script');
    return view(load(id));
  },

  async revise(id: string, feedback: string): Promise<ProjectView> {
    const p = load(id);
    if (!p.scenes.length) throw new UserFacingError('Chưa có kịch bản để sửa');
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Dùng "Copy prompt" để nhờ Claude sửa.');
    enqueue(id, 'revise_script', { feedback });
    projectRepository.addEvent(id, `Nhờ AI sửa: ${feedback}`);
    return view(load(id));
  },

  async approveScript(id: string): Promise<ProjectView> {
    const p = load(id);
    if (p.status !== 'script_review') throw conflict('Video không ở bước duyệt kịch bản');
    if (!p.scenes.length) throw new UserFacingError('Kịch bản chưa có cảnh nào');
    enqueue(id, 'produce');
    projectRepository.update(id, { status: 'producing' });
    projectRepository.addEvent(id, 'Đã duyệt kịch bản, bắt đầu sản xuất');
    return view(load(id));
  },

  async approveVideo(id: string): Promise<ProjectView> {
    const p = load(id);
    if (p.status !== 'video_review') throw conflict('Video không ở bước duyệt video');
    projectRepository.update(id, { status: 'published' });
    projectRepository.addEvent(id, 'Đã duyệt video, sẵn sàng đăng');
    return view(load(id));
  },

  async rejectVideo(id: string, feedback: string): Promise<ProjectView> {
    const p = load(id);
    if (p.status !== 'video_review' && p.status !== 'published') throw conflict('Video chưa được dựng');
    projectRepository.update(id, { status: 'script_review' });
    projectRepository.addEvent(id, `Video bị trả lại: ${feedback}`);
    if (feedback.trim() && (await llm.isReady())) enqueue(id, 'revise_script', { feedback });
    return view(load(id));
  },

  /** Re-run the last failed job. */
  async retry(id: string): Promise<ProjectView> {
    const p = load(id);
    const last = jobRepository.latest(id);
    if (!last || last.state !== 'failed') throw conflict('Không có việc nào bị lỗi để chạy lại');
    enqueue(id, last.kind, last.payload);
    if (last.kind === 'produce') projectRepository.update(id, { status: 'producing' });
    else if (p.status === 'producing') projectRepository.update(id, { status: 'script_review' });
    return view(load(id));
  },

  /** Manual mode: the prompt to paste into Claude when no AI provider is configured. */
  async manualPrompt(id: string, feedback?: string): Promise<string> {
    const p = load(id);
    const [channel, skill] = await Promise.all([channelService.get(p.channelId), skillStore.get(p.skillId)]);
    const tools = skillTools(skill, { tools: toolCatalog });
    const system = systemPrompt(channel, skill, tools);
    const user =
      feedback && p.scenes.length
        ? revisePrompt({ title: p.title, scenes: p.scenes.map(({ tool, narration, props }) => ({ tool, narration, props })), publish: p.publish! }, feedback)
        : briefPrompt(p.idea, p.sceneCount);
    return manualPrompt(system, user, tools);
  },

  /** Manual mode: import the JSON the person pasted back from Claude. */
  async importScript(id: string, text: string): Promise<ProjectView> {
    const p = load(id);
    if (p.status !== 'draft' && p.status !== 'script_review') throw conflict('Kịch bản đã được duyệt');
    let raw: unknown;
    try {
      raw = extractJson(text);
    } catch {
      throw new UserFacingError('Không đọc được JSON. Hãy dán nguyên câu trả lời của Claude.');
    }
    let draft;
    try {
      draft = validateScript(raw, await toolsFor(p));
    } catch (e) {
      throw new UserFacingError('Kịch bản dán vào không đúng định dạng của skill.', String(e));
    }
    projectRepository.update(id, { title: draft.title, publish: draft.publish, scenes: draft.scenes.map((s) => ({ ...s, id: newId() })), status: 'script_review' });
    projectRepository.addEvent(id, 'Đã nhập kịch bản dán từ Claude');
    return view(load(id));
  },
};

/** ProjectStore port for the pipeline (worker side). */
export const projectStore: ProjectStore = {
  async get(id) {
    return load(id);
  },
  async update(id, patch) {
    projectRepository.update(id, patch);
    return load(id);
  },
  async replaceRenders(projectId, renders) {
    return projectRepository.replaceRenders(projectId, renders);
  },
  async addEvent(projectId, message) {
    projectRepository.addEvent(projectId, message);
  },
};
