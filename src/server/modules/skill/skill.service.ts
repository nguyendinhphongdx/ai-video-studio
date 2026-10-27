import type { SkillStore } from '@/core/ports';
import { lintSkill, parseSkill, SKILL_ID_RE, type Skill, type SkillIssue } from '@/core/skills/skill';
import { now } from '@/server/db';
import { ApiError, conflict, notFound } from '@/server/http/api-error';
import { channelRepository } from '@/server/modules/channel/channel.repository';
import { channelService } from '@/server/modules/channel/channel.service';
import { prefsService } from '@/server/modules/prefs/prefs.service';
import { toolCatalog } from '@/tools/registry';

import { channelSkillRepository, marketRepository, type ChannelSkillRow } from './skill.repository';

export interface SkillSummary extends Omit<Skill, 'body'> {
  issues: SkillIssue[];
  /** "market:<id>" when installed from the market, "custom" when written by hand, "ai" when drafted by the AI. */
  source: string;
  updatedAt: string;
}

export interface SkillDetail {
  skill: Skill;
  markdown: string;
  issues: SkillIssue[];
  source: string;
  updatedAt: string;
}

function summarize(row: ChannelSkillRow): SkillSummary {
  try {
    const skill = parseSkill(row.skillId, row.markdown);
    const { body: _body, ...meta } = skill;
    return { ...meta, issues: lintSkill(skill, toolCatalog), source: row.source, updatedAt: row.updatedAt };
  } catch (e) {
    return { id: row.skillId, name: row.skillId, description: '', tools: [], scenes: { min: 0, max: 0 }, version: '1', tags: [], imageStyle: '', issues: [{ level: 'error', message: (e as Error).message }], source: row.source, updatedAt: row.updatedAt };
  }
}

/** Market skills every channel gets once, so a new channel can make a good video straight away. A person may edit or delete them; they are not brought back. */
export const DEFAULT_SKILLS = ['cinematic'];

async function ensureDefaults(channelId: string) {
  for (const marketId of DEFAULT_SKILLS) {
    const key = `default-skill:${channelId}:${marketId}`;
    if (prefsService.flag(key)) continue;
    // Mark first: if anything below fails it must not be retried on every request.
    prefsService.setFlag(key);
    const markdown = await marketRepository.read(marketId);
    if (!markdown || channelSkillRepository.list(channelId).some((r) => r.source === `market:${marketId}`)) continue;
    let id = marketId;
    for (let n = 2; channelSkillRepository.find(channelId, id); n++) id = `${marketId}-${n}`.slice(0, 48);
    channelSkillRepository.insert({ channelId, skillId: id, markdown, source: `market:${marketId}`, createdAt: now() });
    // A channel with no default skill gets this one, so "create video" has something sensible preselected.
    const channel = channelRepository.find(channelId);
    if (channel && !channel.defaultSkillId) channelRepository.update({ ...channel, defaultSkillId: id, updatedAt: now() });
  }
}

/** Skills that videos, series or the channel default already point at were shared before skills belonged to channels: copy them in once. */
async function adoptReferenced(channelId: string) {
  for (const id of channelSkillRepository.referenced(channelId)) {
    if (channelSkillRepository.find(channelId, id)) continue;
    const markdown = await marketRepository.read(id);
    if (markdown) channelSkillRepository.insert({ channelId, skillId: id, markdown, source: `market:${id}`, createdAt: now() });
  }
}

function validate(id: string, markdown: string): void {
  if (!SKILL_ID_RE.test(id)) throw new ApiError(400, 'validation_error', 'Mã skill chỉ gồm chữ thường, số và dấu gạch ngang (2-49 ký tự)');
  let skill: Skill;
  try {
    skill = parseSkill(id, markdown);
  } catch (e) {
    throw new ApiError(400, 'validation_error', (e as Error).message);
  }
  const errors = lintSkill(skill, toolCatalog).filter((i) => i.level === 'error');
  if (errors.length) throw new ApiError(400, 'validation_error', errors.map((e) => e.message).join('; '));
}

export const skillService = {
  async list(channelId: string): Promise<SkillSummary[]> {
    await channelService.get(channelId);
    await adoptReferenced(channelId);
    await ensureDefaults(channelId);
    return channelSkillRepository.list(channelId).map(summarize);
  },

  async get(channelId: string, id: string): Promise<SkillDetail> {
    await channelService.get(channelId);
    let row = channelSkillRepository.find(channelId, id);
    if (!row) {
      await adoptReferenced(channelId);
      await ensureDefaults(channelId);
      row = channelSkillRepository.find(channelId, id);
    }
    if (!row) throw notFound(`skill "${id}" của kênh này`);
    return { skill: parseSkill(id, row.markdown), markdown: row.markdown, issues: lintSkill(parseSkill(id, row.markdown), toolCatalog), source: row.source, updatedAt: row.updatedAt };
  },

  /** Save raw SKILL.md text; refuses a file that does not parse or uses unknown tools. */
  async save(channelId: string, id: string, markdown: string, { create = false, source = 'custom' } = {}): Promise<SkillDetail> {
    await channelService.get(channelId);
    validate(id, markdown);
    const exists = channelSkillRepository.find(channelId, id) !== null;
    if (create && exists) throw conflict(`Kênh đã có skill "${id}"`);
    if (!create && !exists) throw notFound(`skill "${id}" của kênh này`);
    if (create) channelSkillRepository.insert({ channelId, skillId: id, markdown, source, createdAt: now() });
    else channelSkillRepository.update(channelId, id, markdown, now());
    return skillService.get(channelId, id);
  },

  /** Copies a market skill into the channel; from then on it is the channel's own and can be edited freely. */
  async install(channelId: string, marketId: string): Promise<SkillDetail> {
    await channelService.get(channelId);
    const markdown = await marketRepository.read(marketId);
    if (!markdown) throw notFound(`skill "${marketId}" trong market`);
    let id = marketId;
    for (let n = 2; channelSkillRepository.find(channelId, id); n++) id = `${marketId}-${n}`.slice(0, 48);
    validate(id, markdown);
    channelSkillRepository.insert({ channelId, skillId: id, markdown, source: `market:${marketId}`, createdAt: now() });
    return skillService.get(channelId, id);
  },

  async remove(channelId: string, id: string): Promise<void> {
    const channel = await channelService.get(channelId);
    await skillService.get(channelId, id);
    const used = channelSkillRepository.usage(channelId, id);
    if (used.episodes || used.series) throw conflict(`Skill đang được dùng bởi ${used.episodes} video và ${used.series} series. Đổi sang skill khác trước khi xoá.`);
    if (channel.defaultSkillId === id) throw conflict('Đây là skill mặc định của kênh. Chọn skill mặc định khác trước khi xoá.');
    channelSkillRepository.remove(channelId, id);
  },
};

export const skillStore: SkillStore = {
  async get(channelId, id) {
    return (await skillService.get(channelId, id)).skill;
  },
  async list(channelId) {
    return (await skillService.list(channelId)).filter((s) => !s.issues.some((i) => i.level === 'error')).map(({ id, name, description }) => ({ id, name, description }));
  },
};
