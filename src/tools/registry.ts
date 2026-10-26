// Tool catalog (isomorphic). Register a new tool here after adding its folder.
import { createToolCatalog } from '@/core/tools/catalog';

import { hyperframesTool } from './hyperframes/tool';
import { remotionTool } from './remotion/tool';

export const TOOLS = [remotionTool, hyperframesTool];

export const toolCatalog = createToolCatalog(TOOLS);
