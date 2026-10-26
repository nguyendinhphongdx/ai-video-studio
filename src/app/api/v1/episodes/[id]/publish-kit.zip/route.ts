import { route } from '@/server/http/route';
import { publishService } from '@/server/modules/publish/publish.service';

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const { name, data } = await publishService.kitZip(id);
  return new Response(new Blob([data as BlobPart]), { headers: { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${name}"`, 'content-length': String(data.byteLength) } });
});
