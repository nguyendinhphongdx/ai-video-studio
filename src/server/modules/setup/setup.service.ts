// Project setup: one idea becomes a proposal (nothing saved), the approved proposal becomes a channel with its
// knowledge, skill, first series and planned picture library, and a worker job draws that library on request.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { runTask } from '@/core/agent/runner';
import { castPrompt, heroPrompt } from '@/core/character/cast';
import type { ContextInput } from '@/core/context/layer';
import { DEFAULT_IMAGE_STYLE, UserFacingError, type Job, type SeriesBible } from '@/core/domain';
import { setupProblems, setupProjectTask, type ProjectSetup, type SetupSkill } from '@/core/tasks/setup-project';
import { images } from '@/server/adapters/image/image.service';
import { llm } from '@/server/adapters/llm/llm.service';
import { toSprite } from '@/server/adapters/media/chroma-key';
import { resolveMedia, saveCharacterFile } from '@/server/adapters/media/media.service';
import { withUsage } from '@/server/context';
import { appDeps } from '@/server/core-deps';
import { channelService, type ChannelView } from '@/server/modules/channel/channel.service';
import { jobRepository } from '@/server/modules/job/job.repository';
import { knowledgeService } from '@/server/modules/knowledge/knowledge.service';
import { seriesService } from '@/server/modules/series/series.service';
import { marketService } from '@/server/modules/skill/market.service';
import { skillService } from '@/server/modules/skill/skill.service';

import type { SetupInput } from './setup.types';

async function marketSkills(): Promise<SetupSkill[]> {
  return (await marketService.list()).filter((s) => !s.issues.some((i) => i.level === 'error')).map((s) => ({ id: s.id, name: s.name, description: s.description }));
}

/** Library entries that still have no picture. */
export function missingLibrary(bible: SeriesBible) {
  return (bible.library ?? []).filter((item) => (item.kind === 'hero' ? !bible.characterAssets.length : !bible.characterCast[item.id]));
}

export const setupService = {
  async propose(idea: string): Promise<{ proposal: ProjectSetup; skills: SetupSkill[] }> {
    if (!(await llm.isReady())) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt, hoặc tự điền thông tin dự án.');
    const skills = await marketSkills();
    const runner = { llm: appDeps.llm, runs: appDeps.aiRuns, layers: appDeps.layers };
    // A project that does not exist yet has no context layers to render.
    const context = { episode: null, series: null } as unknown as ContextInput;
    const ask = (fix?: { draft: ProjectSetup; problems: string[] }) => withUsage({ purpose: 'setup-project' }, () => runTask(runner, setupProjectTask, { idea, skills, fix }, context));
    let proposal = await ask();
    // One repair round for what the person would otherwise have to fill in; if it fails, the first proposal stands.
    const problems = setupProblems(proposal);
    if (problems.length) {
      const better = await ask({ draft: proposal, problems }).catch(() => null);
      if (better && setupProblems(better).length < problems.length) proposal = better;
    }
    return { proposal, skills };
  },

  async apply(input: SetupInput): Promise<ChannelView> {
    if (!(await marketSkills()).some((s) => s.id === input.skillId)) throw new UserFacingError('Skill đã chọn không còn trong kho. Chọn skill khác.');
    const base = {
      name: input.name,
      description: input.description,
      font: 'Baloo2' as const,
      imageStyle: input.imageStyle,
      introDesign: null,
      outroDesign: null,
      audience: input.audience,
      style: input.style,
      voice: input.voice,
      outroText: input.outroText,
      subscribeText: '🔔 ĐĂNG KÝ KÊNH',
      hashtags: input.hashtags,
      music: 'music.wav',
      palette: input.palette,
    };
    const channel = await channelService.create({ ...base, defaultSkillId: null });
    const skill = await skillService.install(channel.id, input.skillId);
    const updated = await channelService.update(channel.id, { ...base, defaultSkillId: skill.skill.id });
    if (input.knowledge.trim()) await knowledgeService.save(channel.id, input.knowledge, 'Thiết lập dự án');

    const { series } = input;
    const template = await seriesService.template(channel.id, skill.skill.id);
    const hero = series.cast.find((c) => c.kind === 'hero');
    await seriesService.create({
      channelId: channel.id,
      name: series.name,
      skillId: skill.skill.id,
      bible: {
        ...template.bible,
        premise: series.premise,
        instructions: series.instructions,
        avoid: series.avoid,
        host: hero?.name ?? '',
        characters: series.cast.map((c) => `${c.name} (${c.id}): ${c.description}`).join('\n').slice(0, 2000),
        library: series.cast,
        brandIdeas: { logo: input.logoPrompt, introArt: input.introArtPrompt },
      },
      format: template.format,
      publish: template.publish,
      roadmap: series.roadmap,
    });
    return updated;
  },

  /** Queues the missing library pictures of a series (one paid picture each). */
  async requestLibrary(seriesId: string): Promise<Job> {
    const series = await seriesService.get(seriesId);
    const running = (await jobRepository.listActive()).find((j) => j.kind === 'draw_library' && j.payload.seriesId === seriesId);
    if (running) return running;
    if (!missingLibrary(series.rules.bible).length) throw new UserFacingError('Thư viện đã đủ ảnh.');
    if (!(await images.isReady())) throw new UserFacingError('Chưa cài đặt tạo ảnh AI. Mở Cài đặt, nhập API key ở mục Tạo ảnh AI.');
    return await jobRepository.insert(null, 'draw_library', { seriesId, channelId: series.channelId });
  },

  /** Runs in the worker: the main character first (it sets the style), then the others. What got drawn is kept. */
  async drawLibrary(job: Job, progress: (f: number, phase?: string) => void): Promise<void> {
    const seriesId = String(job.payload.seriesId);
    const series = await seriesService.get(seriesId);
    const channel = await channelService.get(series.channelId);
    const todo = missingLibrary(series.rules.bible).sort((a, b) => Number(b.kind === 'hero') - Number(a.kind === 'hero'));
    const style = channel.imageStyle.trim() || DEFAULT_IMAGE_STYLE;
    const made: { hero?: string; cast: Record<string, string> } = { cast: {} };
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avs-library-'));
    try {
      let reference = series.rules.bible.characterAssets[0];
      for (const [i, item] of todo.entries()) {
        progress(i / todo.length, `Vẽ ${item.name}`);
        const raw = path.join(dir, `${item.id}.png`);
        const isHero = item.kind === 'hero';
        const prompt = isHero || !reference ? heroPrompt(item.description, style) : castPrompt(item.description, item.kind === 'item' ? 'item' : 'character');
        await images.generate(prompt, raw, { purpose: 'character_sprite' }, !isHero && reference ? [resolveMedia(reference)] : []);
        const saved = await saveCharacterFile((await toSprite(await fs.readFile(raw))).png, '.png');
        if (isHero) made.hero = reference = saved;
        else made.cast[item.id] = saved;
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
      if (made.hero || Object.keys(made.cast).length) {
        // Read again: the person may have edited the series while the pictures were being drawn.
        const { rules } = await seriesService.get(seriesId);
        await seriesService.saveRules(seriesId, {
          skillId: rules.skillId,
          format: rules.format,
          publish: rules.publish,
          bible: {
            ...rules.bible,
            characterAssets: made.hero ? [made.hero, ...rules.bible.characterAssets] : rules.bible.characterAssets,
            characterSprites: made.hero ? { ...rules.bible.characterSprites, neutral: made.hero } : rules.bible.characterSprites,
            characterCast: { ...rules.bible.characterCast, ...made.cast },
          },
        });
      }
    }
  },
};
