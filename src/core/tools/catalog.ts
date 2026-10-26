import type { BlockRef } from '../domain/episode';

import { normalizeRef } from './mention';
import { blockRef, type ResolvedBlock, type ToolDefinition } from './tool';

export interface ToolCatalog {
  tools(): ToolDefinition[];
  block(ref: BlockRef): ResolvedBlock | undefined;
  /** Expand references ("remotion" = every block of the tool) into blocks; unknown refs are returned separately. */
  resolve(refs: string[]): { blocks: ResolvedBlock[]; unknown: string[] };
}

/** Builds the catalog and fails fast on duplicate tool or block ids. */
export function createToolCatalog(tools: ToolDefinition[]): ToolCatalog {
  const byRef = new Map<string, ResolvedBlock>();
  const toolIds = new Set<string>();
  for (const tool of tools) {
    if (toolIds.has(tool.id)) throw new Error(`Duplicate tool id: ${tool.id}`);
    toolIds.add(tool.id);
    for (const b of tool.blocks) {
      const ref = blockRef(tool.id, b.id);
      if (byRef.has(ref)) throw new Error(`Duplicate block: ${ref}`);
      byRef.set(ref, { ...b, ref, tool });
    }
  }
  return {
    tools: () => tools,
    block: (ref) => byRef.get(normalizeRef(ref)),
    resolve(refs) {
      const blocks: ResolvedBlock[] = [];
      const unknown: string[] = [];
      for (const raw of refs) {
        const ref = normalizeRef(raw);
        const tool = tools.find((t) => t.id === ref);
        const found = tool ? tool.blocks.map((b) => byRef.get(blockRef(tool.id, b.id))!) : byRef.has(ref) ? [byRef.get(ref)!] : null;
        if (!found) unknown.push(ref);
        else for (const b of found) if (!blocks.includes(b)) blocks.push(b);
      }
      return { blocks, unknown };
    },
  };
}
