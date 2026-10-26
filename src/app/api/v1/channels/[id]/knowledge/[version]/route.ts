import { ApiError } from '@/server/http/api-error';
import { route } from '@/server/http/route';
import { knowledgeService } from '@/server/modules/knowledge/knowledge.service';

export const GET = route<{ id: string; version: string }>((_req, { id, version }) => {
  const n = Number(version);
  if (!Number.isInteger(n) || n < 1) throw new ApiError(400, 'validation_error', 'Phiên bản không hợp lệ');
  return knowledgeService.version(id, n);
});
