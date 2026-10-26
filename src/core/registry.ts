// Startup self-check: a broken registration fails loudly at boot instead of in the middle of a job.
import { validateLayers, type ContextLayer } from './context/layer';
import { orderSteps, type PipelineStep } from './pipeline/step';
import type { QualityCheck } from './quality/check';
import type { RendererCatalog } from './ports';
import type { ToolCatalog } from './tools/catalog';

export function validateRegistries(r: { tools: ToolCatalog; renderers?: RendererCatalog; layers: ContextLayer[]; checks: QualityCheck[]; steps?: PipelineStep<never>[] }) {
  validateLayers(r.layers);
  const checkIds = new Set<string>();
  for (const c of r.checks) {
    if (checkIds.has(c.id)) throw new Error(`Duplicate quality check: ${c.id}`);
    checkIds.add(c.id);
  }
  if (r.renderers) for (const t of r.tools.tools()) r.renderers.get(t.id);
  if (r.steps) orderSteps(r.steps);
}
