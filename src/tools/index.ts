// Tool catalog (isomorphic). Register a new tool here after adding its definition and renderer.
import type { ToolCatalog } from '@/core/ports';
import type { ToolDefinition } from '@/core/tool';

import { cardsTool } from './cards/definition';
import { hyperframesCardsTool } from './hyperframes-cards/definition';
import { outroTool } from './outro/definition';
import { titleTool } from './title/definition';
import { whiteboardTool } from './whiteboard/definition';

export const TOOLS: ToolDefinition[] = [titleTool, cardsTool, whiteboardTool, outroTool, hyperframesCardsTool];

const byId = new Map(TOOLS.map((t) => [t.id, t]));

export const toolCatalog: ToolCatalog = {
  get: (id) => byId.get(id),
  all: () => TOOLS,
};
