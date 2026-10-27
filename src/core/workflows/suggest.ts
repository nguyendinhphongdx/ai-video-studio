import { runTask } from '../agent/runner';
import { UserFacingError } from '../domain/errors';
import type { CoreDeps } from '../ports';
import { activeSlots, formatFromSkill } from '../series/format';
import { suggestTopicsTask, type RecentVideo } from '../tasks/suggest-topics';

/** Ideas for the channel's next videos. One cheap AI call; nothing is created. */
export async function suggestTopics(deps: CoreDeps, channelId: string, recent: RecentVideo[], count = 5): Promise<{ topic: string; why: string }[]> {
  const channel = await deps.channels.get(channelId);
  if (!channel.defaultSkillId) throw new UserFacingError('Kênh chưa có skill mặc định. Cài một skill rồi đặt làm mặc định để AI hiểu kiểu video của kênh.');
  const skill = await deps.skills.get(channelId, channel.defaultSkillId);
  const knowledge = await deps.channels.knowledge(channelId);
  const format = formatFromSkill(skill, null, deps.tools);
  const ctx = { channel, series: null, knowledge, skill, format, slots: activeSlots(format, null), blocks: [], memory: { season: null, recent: [] }, episode: null, neighbours: { previousTopic: null, nextTopic: null } };
  return runTask({ llm: deps.llm, runs: deps.aiRuns, layers: deps.layers }, suggestTopicsTask, { recent, count }, ctx);
}
