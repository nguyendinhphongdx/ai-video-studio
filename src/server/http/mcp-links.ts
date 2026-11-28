// The two routes a file link opens. No session: the token in the address is the permission.
import { canReadMedia } from '@/server/adapters/media/media-access';
import { runWithContext } from '@/server/context';
import { dbReady } from '@/server/db';
import { linkService, MAX_UPLOAD_BYTES } from '@/server/modules/mcp/links.service';

import { ApiError, apiErrorResponse, notFound } from './api-error';
import { serveMedia } from './serve-media';

type Ctx = { params: Promise<{ token: string }> };
const gone = () => new ApiError(404, 'not_found', 'Liên kết không đúng, đã hết hạn hoặc đã dùng.');

export async function viewLinkRoute(req: Request, { params }: Ctx): Promise<Response> {
  try {
    await dbReady();
    const found = await linkService.fileOf((await params).token);
    if (!found) throw gone();
    return await runWithContext(found.context, async () => {
      if (!(await canReadMedia(found.path))) throw notFound('tệp');
      return serveMedia(req, found.path);
    });
  } catch (e) {
    return apiErrorResponse(e, '/api/mcp/media');
  }
}

export async function uploadLinkRoute(req: Request, { params }: Ctx): Promise<Response> {
  try {
    await dbReady();
    // Checked before the body is read; a little room for the form around the file.
    if (Number(req.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES + 100_000) throw new ApiError(413, 'validation_error', 'File quá lớn.');
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw new ApiError(400, 'validation_error', 'Gửi file ở trường "file".');
    if (!(await linkService.receive((await params).token, file))) throw gone();
    return Response.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, '/api/mcp/upload');
  }
}
