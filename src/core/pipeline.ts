// Production pipeline as plain orchestration over ports:
// idea -> script (AI, per skill + tools) -> [person approves] -> voice -> one clip per scene per format
// (each scene rendered by its own tool) -> join + music -> [person approves] -> publish kit.
import path from 'node:path';

import { FORMATS, UserFacingError, type Channel, type Project, type Render, type Scene } from './domain';
import type { PipelineDeps, ProgressFn } from './ports';
import { briefPrompt, revisePrompt, scriptSchema, systemPrompt, validateScript, type ScriptDraft } from './script';
import type { Skill } from './skill';
import { buildTimeline } from './timeline';
import type { RenderBrand, ToolDefinition } from './tool';

export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

export function slugify(s: string): string {
  const slug = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return slug || 'video';
}

/** Tools a skill may use, in the skill's order. Unknown ids are a broken skill, not a silent skip. */
export function skillTools(skill: Skill, deps: Pick<PipelineDeps, 'tools'>): ToolDefinition[] {
  return skill.tools.map((id) => {
    const tool = deps.tools.get(id);
    if (!tool) throw new UserFacingError(`Skill "${skill.name}" dùng tool không tồn tại: @${id}`);
    return tool;
  });
}

const withIds = (draft: ScriptDraft): Scene[] => draft.scenes.map((s) => ({ ...s, id: newId() }));

export async function writeScript(deps: PipelineDeps, projectId: string, progress: ProgressFn): Promise<Project> {
  const project = await deps.projects.get(projectId);
  const [channel, skill] = await Promise.all([deps.channels.get(project.channelId), deps.skills.get(project.skillId)]);
  const tools = skillTools(skill, deps);
  await progress(0.1, 'ai');
  const raw = await deps.llm.generateObject({
    system: systemPrompt(channel, skill, tools),
    user: briefPrompt(project.idea, project.sceneCount),
    schema: scriptSchema(tools),
  });
  const draft = validateScript(raw, tools);
  const updated = await deps.projects.update(projectId, { title: draft.title, scenes: withIds(draft), publish: draft.publish, status: 'script_review' });
  await deps.projects.addEvent(projectId, 'AI đã viết xong kịch bản, chờ duyệt');
  return updated;
}

export function currentDraft(project: Project): ScriptDraft {
  return {
    title: project.title,
    scenes: project.scenes.map(({ tool, narration, props }) => ({ tool, narration, props })),
    publish: project.publish ?? { youtube: { title: '', description: '', tags: [] }, facebook: { post: '' }, tiktok: { caption: '', hashtags: [] } },
  };
}

export async function reviseScript(deps: PipelineDeps, projectId: string, feedback: string, progress: ProgressFn): Promise<Project> {
  const project = await deps.projects.get(projectId);
  const [channel, skill] = await Promise.all([deps.channels.get(project.channelId), deps.skills.get(project.skillId)]);
  const tools = skillTools(skill, deps);
  await progress(0.1, 'ai');
  const raw = await deps.llm.generateObject({
    system: systemPrompt(channel, skill, tools),
    user: revisePrompt(currentDraft(project), feedback),
    schema: scriptSchema(tools),
  });
  const draft = validateScript(raw, tools);
  const updated = await deps.projects.update(projectId, { title: draft.title, scenes: withIds(draft), publish: draft.publish, status: 'script_review' });
  await deps.projects.addEvent(projectId, `AI đã sửa kịch bản theo yêu cầu: ${feedback}`);
  return updated;
}

export async function renderBrand(deps: Pick<PipelineDeps, 'media'>, channel: Channel): Promise<RenderBrand> {
  return {
    name: channel.name,
    logoSrc: channel.logoPath ? await deps.media.dataUri(deps.media.absolute(channel.logoPath)) : null,
    outroText: channel.outroText,
    subscribeText: channel.subscribeText,
    palette: channel.palette,
  };
}

// Share of the job's progress bar per stage.
const VOICE_SHARE = 0.15;
const JOIN_SHARE = 0.05;

export async function produce(deps: PipelineDeps, projectId: string, progress: ProgressFn): Promise<Render[]> {
  const project = await deps.projects.get(projectId);
  if (!project.scenes.length) throw new UserFacingError('Kịch bản chưa có cảnh nào');
  const [channel, skill] = await Promise.all([deps.channels.get(project.channelId), deps.skills.get(project.skillId)]);
  for (const s of project.scenes) {
    if (!deps.tools.get(s.tool)) throw new UserFacingError(`Cảnh dùng tool không tồn tại: @${s.tool}`);
  }
  const dir = await deps.media.projectDir(projectId);
  const scenes = project.scenes;

  // 1. Voice: one mp3 per scene with narration.
  const voice = new Map<string, { file: string; seconds: number }>();
  for (const [i, scene] of scenes.entries()) {
    if (scene.narration.trim()) {
      const file = path.join(dir, 'voice', `${i}-${scene.id}.mp3`);
      voice.set(scene.id, { file, seconds: await deps.tts.synthesize(scene.narration, project.voice, file) });
    }
    await progress((VOICE_SHARE * (i + 1)) / scenes.length, 'voice');
  }
  await deps.projects.addEvent(projectId, `Đã lồng tiếng ${voice.size} cảnh`);

  const timeline = buildTimeline(scenes, (id) => deps.tools.get(id), (s) => voice.get(s.id)?.seconds ?? 0);
  const brand = await renderBrand(deps, channel);
  const narrationSrc = new Map<string, string>();
  for (const [id, v] of voice) narrationSrc.set(id, await deps.media.dataUri(v.file));

  // 2. One clip per scene per format, each drawn by the scene's own tool; then join.
  const renderShare = 1 - VOICE_SHARE - JOIN_SHARE;
  const renders: Omit<Render, 'id' | 'projectId' | 'createdAt'>[] = [];
  for (const [fi, format] of project.formats.entries()) {
    const { width, height } = FORMATS[format];
    const clips: string[] = [];
    for (const [si, scene] of scenes.entries()) {
      const step = fi * scenes.length + si;
      const total = project.formats.length * scenes.length;
      const base = VOICE_SHARE + (renderShare * step) / total;
      const outFile = path.join(dir, 'clips', format, `${si}.mp4`);
      await progress(base, `render:${format}:${si}`);
      await deps.renderers.get(scene.tool).render(
        {
          toolId: scene.tool,
          props: scene.props,
          ordinal: scenes.slice(0, si + 1).filter((x) => x.tool === scene.tool).length,
          brand,
          format,
          width,
          height,
          durationSec: timeline.scenes[si]!.duration,
          narrationSrc: narrationSrc.get(scene.id) ?? null,
        },
        { outFile, workDir: path.join(dir, 'work', format, String(si)), onProgress: (f) => void progress(base + (renderShare * f) / total, `render:${format}:${si}`) },
      );
      clips.push(outFile);
    }
    await progress(VOICE_SHARE + renderShare * ((fi + 1) / project.formats.length), `join:${format}`);
    const final = path.join(dir, 'renders', `${slugify(project.title)}-${format}.mp4`);
    const music = project.music && skill.music !== 'none' ? { file: deps.media.asset(`audio/${skill.music}`), volume: voice.size ? 0.12 : 0.35 } : undefined;
    const durationSec = await deps.video.concat(clips, final, { width, height, music });
    renders.push({ format, filePath: deps.media.relative(final), durationSec });
    await deps.projects.addEvent(projectId, `Dựng xong bản ${FORMATS[format].label}`);
  }

  await progress(1, 'done');
  const saved = await deps.projects.replaceRenders(projectId, renders);
  await deps.projects.update(projectId, { status: 'video_review' });
  await deps.projects.addEvent(projectId, 'Video đã sẵn sàng, chờ duyệt');
  return saved;
}

/** Markdown publish kit (also offered as a download). */
export function publishMarkdown(project: Project, renders: Render[]): string {
  const kit = project.publish;
  if (!kit) return `# ${project.title}\n`;
  return `# ${project.title}

## Video
${renders.map((r) => `- ${r.filePath} (${FORMATS[r.format].label})`).join('\n')}

## YouTube
**Tiêu đề:** ${kit.youtube.title}

**Mô tả:**
${kit.youtube.description}

**Tags:** ${kit.youtube.tags.join(', ')}

## Facebook
${kit.facebook.post}

## TikTok / Reels / Shorts
${kit.tiktok.caption} ${kit.tiktok.hashtags.join(' ')}
`;
}
