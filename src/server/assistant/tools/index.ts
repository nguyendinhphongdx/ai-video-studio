// Registered assistant tools. Add a tool file and list it here; names are checked at startup.
import { validateTools, type StudioTool } from '@/core/assistant/tool';

import { channelTools } from './channel';
import { characterTools } from './character';
import { episodeTools } from './episodes';
import { sceneTools } from './scenes';
import { seriesTools } from './series';
import { skillTools } from './skill';

export const ASSISTANT_TOOLS = [...channelTools, ...skillTools, ...seriesTools, ...characterTools, ...episodeTools, ...sceneTools] as StudioTool[];
validateTools(ASSISTANT_TOOLS);
