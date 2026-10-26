import { notFound } from '@/server/http/api-error';
import { channelService } from '@/server/modules/channel/channel.service';

import { knowledgeRepository, type KnowledgeVersion } from './knowledge.repository';

export type { KnowledgeVersion };

export interface KnowledgeView {
  current: KnowledgeVersion | null;
  /** Newest first, without the text (load one with get(version)). */
  versions: Omit<KnowledgeVersion, 'markdown'>[];
}

export const knowledgeService = {
  async get(channelId: string): Promise<KnowledgeView> {
    await channelService.get(channelId);
    return { current: knowledgeRepository.latest(channelId), versions: knowledgeRepository.list(channelId).map(({ markdown: _m, ...v }) => v) };
  },

  async version(channelId: string, version: number): Promise<KnowledgeVersion> {
    await channelService.get(channelId);
    const v = knowledgeRepository.find(channelId, version);
    if (!v) throw notFound(`phiên bản tri thức v${version}`);
    return v;
  },

  /** Saving writes a new immutable version (nothing happens when the text did not change). */
  async save(channelId: string, markdown: string, note: string): Promise<KnowledgeView> {
    await channelService.get(channelId);
    const text = markdown.trim();
    const latest = knowledgeRepository.latest(channelId);
    if (!(latest && latest.markdown === text) && (text || latest)) knowledgeRepository.insert(channelId, text, note.trim());
    return knowledgeService.get(channelId);
  },
};
