// Links an outside AI is given for files: they work without signing in, so each opens one thing, for a short time, and
// stops with the code that asked for it.
import { createHash, randomBytes } from 'node:crypto';

import { UserFacingError } from '@/core/domain/errors';
import { newId } from '@/core/domain/ids';
import { makeContext, runWithContext } from '@/server/context';
import { authRepository } from '@/server/modules/auth/auth.repository';
import { channelService } from '@/server/modules/channel/channel.service';
import { episodeService } from '@/server/modules/episode/episode.service';

import { mcpRepository } from './mcp.repository';

export const VIEW_MINUTES = 60;
export const UPLOAD_MINUTES = 15;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export type UploadTarget = { purpose: 'logo' | 'avatar' | 'music'; channelId: string } | { purpose: 'scene_picture'; channelId: string; episodeId: string; sceneId: string };

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

async function create(codeId: string, purpose: string, target: Record<string, unknown>, minutes: number): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
  await mcpRepository.insertLink({ id: newId(), tokenHash: hash(token), purpose, target: JSON.stringify({ ...target, codeId }), expiresAt });
  return { token, expiresAt };
}

/** The link and who it acts as; null when it is unknown or expired, or its code no longer works. */
async function find(token: string) {
  const link = await mcpRepository.linkByHash(hash(token));
  if (!link || link.expiresAt <= new Date().toISOString() || !link.workspaceId || !link.userId) return null;
  if ((await authRepository.roleIn(link.workspaceId, link.userId)) !== 'owner') return null;
  const [user, workspace] = await Promise.all([authRepository.userById(link.userId), authRepository.workspaceById(link.workspaceId)]);
  if (!user || !workspace) return null;
  const { passwordHash: _, ...person } = user;
  const context = makeContext(person, workspace, 'owner');
  const target = JSON.parse(link.target) as Record<string, string>;
  const code = await runWithContext(context, () => mcpRepository.findCode(target.codeId!));
  if (!code || code.revokedAt || (code.expiresAt && code.expiresAt <= new Date().toISOString())) return null;
  return { link, target, context };
}

export const linkService = {
  /** A link to one file of the workspace; the caller has checked the file is the workspace's. */
  view: (codeId: string, path: string) => create(codeId, 'view', { path }, VIEW_MINUTES),

  upload: (codeId: string, target: UploadTarget) => create(codeId, 'upload', target, UPLOAD_MINUTES),

  async fileOf(token: string) {
    const found = await find(token);
    return found && found.link.purpose === 'view' ? { path: found.target.path!, context: found.context } : null;
  },

  /** Takes the file sent to an upload link, with the same checks as the screens. False when the link does not work. */
  async receive(token: string, file: File): Promise<boolean> {
    const found = await find(token);
    if (!found || found.link.purpose !== 'upload') return false;
    if (!(await mcpRepository.takeLink(found.link.id, new Date().toISOString()))) return false;
    const target = found.target as unknown as UploadTarget;
    await runWithContext(found.context, async () => {
      try {
        if (target.purpose === 'logo') await channelService.setLogo(target.channelId, file);
        else if (target.purpose === 'avatar') await channelService.setAvatar(target.channelId, file);
        else if (target.purpose === 'music') await channelService.setMusic(target.channelId, file);
        else if (target.purpose === 'scene_picture') await episodeService.uploadScenePicture(target.episodeId, target.sceneId, file);
        else throw new UserFacingError('Liên kết không hợp lệ.');
      } catch (e) {
        // A refused file does not use the link up.
        await mcpRepository.releaseLink(found.link.id);
        throw e;
      }
    });
    return true;
  },
};
