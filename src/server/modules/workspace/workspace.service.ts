// A workspace's members and invite links. Owners manage people; members only see who is in. Who is acting and in which
// workspace always comes from ctx().
import crypto from 'node:crypto';

import { newId } from '@/core/domain/ids';
import { ctx, requireOwner } from '@/server/context';
import { ApiError, conflict, notFound } from '@/server/http/api-error';

import { authRepository } from '../auth/auth.repository';
import { authService } from '../auth/auth.service';
import type { MeView, Role } from '../auth/auth.types';
import { workspaceRepository } from './workspace.repository';
import type { CreateInviteInput, InvitePreview, InviteView, Member } from './workspace.types';

/** How long an invite link stays valid. */
export const INVITE_DAYS = 7;

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');


export const workspaceService = {
  async members(): Promise<Member[]> {
    return await workspaceRepository.members();
  },

  async rename(name: string): Promise<MeView> {
    requireOwner();
    await workspaceRepository.rename(name);
    return await authService.me();
  },

  /** Makes an invite link. The token is returned once (for the link); only its hash is stored. */
  async createInvite(input: CreateInviteInput): Promise<{ invite: InviteView; token: string }> {
    requireOwner();
    if (input.email && (await workspaceRepository.members()).some((m) => m.email === input.email)) throw conflict('Người này đã ở trong workspace.');
    const token = crypto.randomBytes(24).toString('base64url');
    const now = new Date();
    const id = newId();
    await workspaceRepository.insertInvite({ id, tokenHash: sha256(token), email: input.email, role: input.role, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + INVITE_DAYS * 86_400_000).toISOString() });
    return { invite: (await workspaceRepository.invites(now.toISOString())).find((i) => i.id === id)!, token };
  },

  async invites(): Promise<InviteView[]> {
    requireOwner();
    return await workspaceRepository.invites(new Date().toISOString());
  },

  async revokeInvite(id: string) {
    requireOwner();
    await workspaceRepository.revokeInvite(id);
  },

  async setRole(userId: string, role: Role): Promise<Member[]> {
    requireOwner();
    const current = await workspaceRepository.memberRole(userId);
    if (!current) throw notFound('thành viên');
    // A workspace always keeps at least one owner.
    if (current === 'owner' && role !== 'owner' && await workspaceRepository.ownerCount() <= 1) throw conflict('Workspace cần ít nhất một chủ. Chọn người khác làm chủ trước.');
    await workspaceRepository.setRole(userId, role);
    return await workspaceRepository.members();
  },

  async removeMember(userId: string): Promise<Member[]> {
    requireOwner();
    if (userId === ctx().userId) throw conflict('Dùng "Rời workspace" để tự rời đi.');
    if (!await workspaceRepository.memberRole(userId)) throw notFound('thành viên');
    if (await workspaceRepository.memberRole(userId) === 'owner' && await workspaceRepository.ownerCount() <= 1) throw conflict('Workspace cần ít nhất một chủ.');
    await workspaceRepository.removeMember(userId);
    return await workspaceRepository.members();
  },

  /** The signed-in person leaves the current workspace (an owner only when another owner stays). */
  async leave() {
    if ((await authRepository.workspacesOf(ctx().userId)).length <= 1) throw conflict('Đây là workspace duy nhất của bạn, không rời được.');
    if (ctx().role === 'owner' && await workspaceRepository.ownerCount() <= 1) throw conflict('Bạn là chủ duy nhất. Chọn người khác làm chủ trước khi rời.');
    await workspaceRepository.removeMember(ctx().userId);
  },

  /** What an invite link is for, shown to whoever opens it (signed in or not). */
  async preview(token: string): Promise<InvitePreview> {
    const i = await workspaceRepository.inviteByToken(sha256(token));
    if (!i) throw notFound('lời mời');
    const state = i.used_at ? 'used' : i.expires_at <= new Date().toISOString() ? 'expired' : 'open';
    return { workspaceId: i.workspace_id, workspaceName: i.workspace_name, invitedBy: i.by_name, email: i.email, state };
  },

  /** The signed-in person joins the invite's workspace, and their session moves into it. */
  async accept(token: string): Promise<MeView> {
    const i = await workspaceRepository.inviteByToken(sha256(token));
    if (!i) throw notFound('lời mời');
    if (i.used_at) throw conflict('Lời mời này đã được dùng.');
    if (i.expires_at <= new Date().toISOString()) throw conflict('Lời mời đã hết hạn. Nhờ chủ workspace gửi lời mời mới.');
    // Already in: keep the link for the person it was meant for.
    if (await authRepository.roleIn(i.workspace_id, ctx().userId)) throw conflict('Bạn đã ở trong workspace này.');
    if (i.email && i.email !== ctx().user.email) throw new ApiError(403, 'forbidden', `Lời mời này dành cho ${i.email}. Hãy đăng nhập bằng email đó.`);
    if (!await workspaceRepository.acceptInvite(i, new Date().toISOString())) throw conflict('Lời mời này đã được dùng.');
    return await authService.switchWorkspace(i.workspace_id);
  },
};
