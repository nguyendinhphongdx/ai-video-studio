// Server-only renderer registry. Every tool in the catalog must have a renderer here.
import type { RendererCatalog } from '@/core/ports';
import type { ToolRenderer } from '@/core/tool';

import { renderRemotionScene } from './engines/remotion';
import { hyperframesCardsRenderer } from './hyperframes-cards/render';
import { TOOLS } from './index';

const remotion = (toolId: string): ToolRenderer => ({ toolId, render: renderRemotionScene });

const RENDERERS = new Map<string, ToolRenderer>([
  ...TOOLS.filter((t) => t.engine === 'remotion').map((t) => [t.id, remotion(t.id)] as const),
  [hyperframesCardsRenderer.toolId, hyperframesCardsRenderer],
]);

const missing = TOOLS.filter((t) => !RENDERERS.has(t.id)).map((t) => t.id);
if (missing.length) throw new Error(`Tools without a renderer: ${missing.join(', ')}`);

export const rendererCatalog: RendererCatalog = {
  get(toolId) {
    const r = RENDERERS.get(toolId);
    if (!r) throw new Error(`No renderer for tool ${toolId}`);
    return r;
  },
};

export { closeRemotion } from './engines/remotion';
