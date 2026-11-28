// The one list of what an AI can do in the studio, used by the Assistant (and by MCP).
// Add a tool: one class in its own file under a group folder, listed in that folder's index. Names are checked at startup.
import { validateTools, type StudioTool } from '@/core/assistant/tool';

import { channelTools } from './channel';
import { characterTools } from './character';
import { episodeTools } from './episode';
import { sceneTools } from './scene';
import { seriesTools } from './series';
import { skillTools } from './skill';

export const STUDIO_TOOLS: StudioTool[] = [...channelTools, ...skillTools, ...seriesTools, ...characterTools, ...episodeTools, ...sceneTools];
validateTools(STUDIO_TOOLS);

export const ASSISTANT_TOOLS = STUDIO_TOOLS.filter((t) => t.surfaces.includes('assistant'));
