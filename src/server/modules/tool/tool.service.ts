import type { ToolField } from '@/core/tools/tool';
import { toolCatalog } from '@/tools/registry';

/** JSON-safe view of the catalog for the browser (schemas stay on the server). */
export interface BlockInfo {
  ref: string;
  id: string;
  name: string;
  summary: string;
  aiGuide: string;
  fields: ToolField[];
  defaults: Record<string, unknown>;
  minSeconds: number;
}

export interface ToolInfo {
  id: string;
  name: string;
  summary: string;
  version: string;
  requires: string | null;
  previewable: boolean;
  blocks: BlockInfo[];
}

export const toolService = {
  list(): ToolInfo[] {
    return toolCatalog.tools().map((t) => ({
      id: t.id,
      name: t.name,
      summary: t.summary,
      version: t.version,
      requires: t.requires ?? null,
      previewable: t.previewable,
      blocks: t.blocks.map((b) => ({ ref: `${t.id}/${b.id}`, id: b.id, name: b.name, summary: b.summary, aiGuide: b.aiGuide, fields: b.fields, defaults: b.defaults as Record<string, unknown>, minSeconds: b.minSeconds })),
    }));
  },
};
