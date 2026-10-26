// Server-only: tool id -> renderer. Every registered tool must have one (checked at startup).
import type { RendererCatalog } from '@/core/ports';
import type { ToolRenderer } from '@/core/tools/tool';

import { hyperframesRenderer } from './hyperframes/renderer';
import { remotionRenderer } from './remotion/renderer';

const RENDERERS = new Map<string, ToolRenderer>([remotionRenderer, hyperframesRenderer].map((r) => [r.toolId, r]));

export const rendererCatalog: RendererCatalog = {
  get(toolId) {
    const r = RENDERERS.get(toolId);
    if (!r) throw new Error(`No renderer for tool ${toolId}`);
    return r;
  },
};

export { closeRemotion } from './remotion/renderer';
