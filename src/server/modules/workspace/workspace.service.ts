// A workspace's members and invite links. Owners manage people; members only see who is in. Who is acting and in which
// workspace always comes from ctx().
import crypto from 'node:crypto';

import { newId } from '@/core/domain/ids';
import { ctx } from '@/server/context';
import { ApiError, conflict, notFound } from '@/server/http/api-error';

import { authRepository } from '../auth/auth.repository';
import { authService } from '../auth/auth.service';
import type { MeView, Role } from '../auth/auth.types';
import { workspaceRepository } from './workspace.repository';
import type { CreateInviteInput, InvitePreview, InviteView, Member } from './workspace.types';

/** How long an invite link stays valid. */
export const INVITE_DAYS = 7;

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** Only an owner of the current workspace may manage its people (and, later, its keys and budgets). */
export function requireOwner() {
  if (ctx().role !== 'owner') throw new ApiError(403, 'forbidden', 'Chỉ chủ workspace mới làm được việc này.');
}

export const workspaceService = {
  members(): Member[] {
    return workspaceRepository.members();
  },

  rename(name: string): MeView {
    requireOwner();
    workspaceRepository.rename(name);
    return authService.me();
  },

  /** Makes an invite link. The token is returned once (for the link); only its hash is stored. */
  createInvite(input: CreateInviteInput): { invite: InviteView; token: string } {
    requireOwner();
    if (input.email && workspaceRepository.members().some((m) => m.email === input.email)) throw conflict('Người này đã ở trong workspace.');
    const token = crypto.randomBytes(24).toString('base64url');
    const now = new Date();
    const id = newId();
    workspaceRepository.insertInvite({ id, tokenHash: sha256(token), email: input.email, role: input.role, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + INVITE_DAYS * 86_400_000).toISOString() });
    return { invite: workspaceRepository.invites(now.toISOString()).find((i) => i.id === id)!, token };
  },

  invites(): InviteView[] {
    requireOwner();
    return workspaceRepository.invites(new Date().toISOString());
  },

  revokeInvite(id: string) {
    requireOwner();
    workspaceRepository.revokeInvite(id);
  },

  setRole(userId: string, role: Role): Member[] {
    requireOwner();
    const current = workspaceRepository.memberRole(userId);
    if (!current) throw notFound('thành viên');
    // A workspace always keeps at least one owner.
    if (current === 'owner' && role !== 'owner' && workspaceRepository.ownerCount() <= 1) throw conflict('Workspace cần ít nhất một chủ. Chọn người khác làm chủ trước.');
    workspaceRepository.setRole(userId, role);
    return workspaceRepository.members();
  },

  removeMember(userId: string): Member[] {
    requireOwner();
    if (userId === ctx().userId) throw conflict('Dùng "Rời workspace" để tự rời đi.');
    if (!workspaceRepository.memberRole(userId)) throw notFound('thành viên');
    if (workspaceRepository.memberRole(userId) === 'owner' && workspaceRepository.ownerCount() <= 1) throw conflict('Workspace cần ít nhất một chủ.');
    workspaceRepository.removeMember(userId);
    return workspaceRepository.members();
  },

  /** The signed-in person leaves the current workspace (an owner only when another owner stays). */
  leave() {
    if (authRepository.workspacesOf(ctx().userId).length <= 1) throw conflict('Đây là workspace duy nhất của bạn, không rời được.');
    if (ctx().role === 'owner' && workspaceRepository.ownerCount() <= 1) throw conflict('Bạn là chủ duy nhất. Chọn người khác làm chủ trước khi rời.');
    workspaceRepository.removeMember(ctx().userId);
  },

  /** What an invite link is for, shown to whoever opens it (signed in or not). */
  preview(token: string): InvitePreview {
    const i = workspaceRepository.inviteByToken(sha256(token));
    if (!i) throw notFound('lời mời');
    const state = i.used_at ? 'used' : i.expires_at <= new Date().toISOString() ? 'expired' : 'open';
    return { workspaceId: i.workspace_id, workspaceName: i.workspace_name, invitedBy: i.by_name, email: i.email, state };
  },

  /** The signed-in person joins the invite's workspace, and their session moves into it. */
  accept(token: string): MeView {
    const i = workspaceRepository.inviteByToken(sha256(token));
    if (!i) throw notFound('lời mời');
    if (i.used_at) throw conflict('Lời mời này đã được dùng.');
    if (i.expires_at <= new Date().toISOString()) throw conflict('Lời mời đã hết hạn. Nhờ chủ workspace gửi lời mời mới.');
    // Already in: keep the link for the person it was meant for.
    if (authRepository.roleIn(i.workspace_id, ctx().userId)) throw conflict('Bạn đã ở trong workspace này.');
    if (i.email && i.email !== ctx().user.email) throw new ApiError(403, 'forbidden', `Lời mời này dành cho ${i.email}. Hãy đăng nhập bằng email đó.`);
    if (!workspaceRepository.acceptInvite(i, new Date().toISOString())) throw conflict('Lời mời này đã được dùng.');
    return authService.switchWorkspace(i.workspace_id);
  },
};
