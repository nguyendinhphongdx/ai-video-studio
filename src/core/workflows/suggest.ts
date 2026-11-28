import { runTask } from '../agent/runner';
import { UserFacingError } from '../domain/errors';
import type { CoreDeps } from '../ports';
import { activeSlots, formatFromSkill } from '../series/format';
import { analysisProblems, analyzeTopicTask, duplicateOf, type TopicAnalysis } from '../tasks/analyze-topic';
import { suggestTopicsTask, type RecentVideo, type TopicIdea } from '../tasks/suggest-topics';

/** What every topic task reads: the channel, its skill and knowledge. Nothing about one episode. */
async function topicContext(deps: CoreDeps, channelId: string) {
  const channel = await deps.channels.get(channelId);
  if (!channel.defaultSkillId) throw new UserFacingError('Kênh chưa có skill mặc định. Cài một skill rồi đặt làm mặc định để AI hiểu kiểu video của kênh.');
  const skill = await deps.skills.get(channelId, channel.defaultSkillId);
  const knowledge = await deps.channels.knowledge(channelId);
  const format = formatFromSkill(skill, null, deps.tools);
  return { channel, series: null, knowledge, skill, format, slots: activeSlots(format, null), blocks: [], memory: { season: null, recent: [] }, episode: null, neighbours: { previousTopic: null, nextTopic: null } };
}

const runner = (deps: CoreDeps) => ({ llm: deps.llm, runs: deps.aiRuns, layers: deps.layers });

/** Ideas for the channel's next videos, from its story and episode list. One cheap AI call; nothing is created. */
export async function suggestTopics(deps: CoreDeps, channelId: string, recent: RecentVideo[], count = 5, story = ''): Promise<TopicIdea[]> {
  return runTask(runner(deps), suggestTopicsTask, { recent, count, story }, await topicContext(deps, channelId));
}

/**
 * Looks at a topic before an episode is made: title, synopsis, place in the story, problems. A machine checks the answer
 * (a sensible title, a real episode to follow); if it fails the model gets one more try, kept only if it is better. A
 * topic that repeats an existing episode is flagged by comparing words, not by asking the model. Nothing is created.
 */
export async function analyzeTopic(deps: CoreDeps, channelId: string, topic: string, existing: RecentVideo[], story = ''): Promise<TopicAnalysis> {
  const ctx = await topicContext(deps, channelId);
  const ask = (fix?: { draft: TopicAnalysis; problems: string[] }) => runTask(runner(deps), analyzeTopicTask, { topic, existing, story, fix }, ctx);
  let result = await ask();
  const problems = analysisProblems(result, existing);
  if (problems.length) {
    const better = await ask({ draft: result, problems }).catch(() => null);
    if (better && analysisProblems(better, existing).length < problems.length) result = better;
  }
  // What the repair could not fix is not shown as fact: a made-up "after" is dropped.
  const numbers = new Set(existing.map((e) => e.number).filter((n): n is number => n != null));
  if (result.after != null && !numbers.has(result.after)) result = { ...result, after: null };
  const dup = duplicateOf(topic, existing);
  if (dup && !result.problems.some((p) => p.kind === 'duplicate')) {
    result = { ...result, problems: [{ kind: 'duplicate', text: `Ý tưởng này gần giống ${dup.number != null ? `tập ${dup.number}` : 'một tập đã có'} ("${dup.topic}").` }, ...result.problems] };
  }
  return result;
}
