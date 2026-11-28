// Registered assistant tools. Add a tool file and list it here; names are checked at startup.
import { validateTools, type AssistantTool } from '@/core/assistant/tool';

import { channelTools } from './channel';
import { episodeTools } from './episodes';
import { sceneTools } from './scenes';
import { seriesTools } from './series';
import { skillTools } from './skills';

export const ASSISTANT_TOOLS = [...channelTools, ...skillTools, ...seriesTools, ...episodeTools, ...sceneTools] as AssistantTool[];
validateTools(ASSISTANT_TOOLS);
