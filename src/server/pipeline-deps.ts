// Wires the core pipeline to this app's implementations. Imported by the worker and the CLI only
// (it pulls in the Remotion renderer, which must stay out of the Next.js bundle).
import type { PipelineDeps } from '@/core/ports';
import { channelStore } from '@/server/modules/channel/channel.service';
import { llm } from '@/server/modules/llm/llm.service';
import { media } from '@/server/modules/media/media.service';
import { projectStore } from '@/server/modules/project/project.service';
import { skillStore } from '@/server/modules/skill/skill.service';
import { tts } from '@/server/modules/tts/tts.service';
import { video } from '@/server/modules/video/video.service';
import { toolCatalog } from '@/tools';
import { rendererCatalog } from '@/tools/renderers';

export const pipelineDeps: PipelineDeps = {
  projects: projectStore,
  channels: channelStore,
  skills: skillStore,
  tools: toolCatalog,
  renderers: rendererCatalog,
  llm,
  tts,
  media,
  video,
};
