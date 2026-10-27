// Wires the core to this app's adapters. The web app and the worker share everything except renderers:
// only the worker may load Remotion/HyperFrames, so the web app gets a catalog that refuses to render.
import { CONTEXT_LAYERS } from '@/core/context/providers';
import type { CoreDeps, RendererCatalog } from '@/core/ports';
import { QUALITY_CHECKS } from '@/core/quality/checks';
import { validateRegistries } from '@/core/registry';
import { images } from '@/server/adapters/image/image.service';
import { llm } from '@/server/adapters/llm/llm.service';
import { media } from '@/server/adapters/media/media.service';
import { sfx } from '@/server/adapters/sfx/sfx.service';
import { tts } from '@/server/adapters/tts/tts.service';
import { video } from '@/server/adapters/video/video.service';
import { aiRunStore } from '@/server/modules/ai-run/ai-run.repository';
import { channelStore } from '@/server/modules/channel/channel.service';
import { episodeStore } from '@/server/modules/episode/episode.store';
import { memoryStore } from '@/server/modules/memory/memory.repository';
import { eventBus } from '@/server/modules/outbox/outbox.repository';
import { seriesStore } from '@/server/modules/series/series.service';
import { skillStore } from '@/server/modules/skill/skill.service';
import { stepRunStore } from '@/server/modules/step-run/step-run.repository';
import { toolCatalog } from '@/tools/registry';

const noRenderers: RendererCatalog = {
  get: () => {
    throw new Error('Rendering runs in the worker process only');
  },
};

export function createCoreDeps(renderers: RendererCatalog = noRenderers): CoreDeps {
  const deps: CoreDeps = {
    episodes: episodeStore,
    channels: channelStore,
    series: seriesStore,
    skills: skillStore,
    memory: memoryStore,
    tools: toolCatalog,
    renderers,
    layers: CONTEXT_LAYERS,
    checks: QUALITY_CHECKS,
    llm,
    images,
    tts,
    media,
    video,
    aiRuns: aiRunStore,
    stepRuns: stepRunStore,
    events: eventBus,
    sfx,
  };
  validateRegistries({ tools: toolCatalog, renderers: renderers === noRenderers ? undefined : renderers, layers: CONTEXT_LAYERS, checks: QUALITY_CHECKS });
  return deps;
}

/** Deps for the web process (no rendering). */
export const appDeps = createCoreDeps();
