// Extension point: Context provider.
// Every AI call for a channel sees the same layered context, assembled in a fixed order
// (system -> channel -> series instructions -> skill -> style -> format -> memory -> episode).
// A new kind of context (channel stats, character sheets, trends) is one new layer, not edits to prompts.
import type { Channel } from '../domain/channel';
import type { Episode, EpisodeMemory } from '../domain/episode';
import type { Series, SeriesVersion } from '../domain/series';
import type { EpisodeFormat, Slot } from '../series/format';
import type { Skill } from '../skills/skill';
import type { ResolvedBlock } from '../tools/tool';

export type LayerId = 'system' | 'channel' | 'knowledge' | 'instructions' | 'skill' | 'style' | 'format' | 'memory' | 'episode';

/** Everything known about the episode being worked on. Built once per AI call by the workflow. */
export interface ContextInput {
  channel: Channel;
  series: { series: Series; version: SeriesVersion } | null;
  /** What the channel knows about its subject (its own knowledge base), or null. */
  knowledge: { version: number; markdown: string } | null;
  skill: Skill;
  format: EpisodeFormat;
  /** Slots that apply to this episode (conditions evaluated). */
  slots: Slot[];
  /** Union of blocks allowed by the active "ai" slots. */
  blocks: ResolvedBlock[];
  memory: { season: string | null; recent: EpisodeMemory[] };
  /** Null when the AI works at series level (planning a new series). */
  episode: Episode | null;
  neighbours: { previousTopic: string | null; nextTopic: string | null };
}

export interface ContextLayer {
  id: LayerId;
  title: string;
  /** Lower comes first. */
  order: number;
  /** Hard cap so one layer (memory) cannot crowd out the others. */
  maxChars: number;
  render(input: ContextInput): string | null;
}

export interface CompiledSection {
  id: LayerId;
  title: string;
  chars: number;
  truncated: boolean;
}

/** What the AI saw. Stored with each AI run so results can be explained and reproduced. */
export interface CompiledContext {
  sections: CompiledSection[];
  text: string;
}

export function compileContext(layers: ContextLayer[], input: ContextInput, include: LayerId[] | 'all' = 'all'): CompiledContext {
  const chosen = [...layers].filter((l) => include === 'all' || include.includes(l.id)).sort((a, b) => a.order - b.order);
  const sections: CompiledSection[] = [];
  const parts: string[] = [];
  for (const layer of chosen) {
    const raw = layer.render(input)?.trim();
    if (!raw) continue;
    const truncated = raw.length > layer.maxChars;
    const text = truncated ? `${raw.slice(0, layer.maxChars)}\n…(đã rút gọn)` : raw;
    sections.push({ id: layer.id, title: layer.title, chars: text.length, truncated });
    parts.push(`## ${layer.title}\n${text}`);
  }
  return { sections, text: parts.join('\n\n') };
}

export function validateLayers(layers: ContextLayer[]) {
  const ids = new Set<string>();
  for (const l of layers) {
    if (ids.has(l.id)) throw new Error(`Duplicate context layer: ${l.id}`);
    ids.add(l.id);
  }
}
