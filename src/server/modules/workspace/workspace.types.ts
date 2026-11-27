import { z } from 'zod';

import type { Role } from '../auth/auth.types';

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

/** A pending invite as the owner sees it (the link itself is shown once, when it is made). */
export interface InviteView {
  id: string;
  email: string;
  role: Role;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

/** What an invite link shows before it is accepted (to anyone who has the link). */
export interface InvitePreview {
  workspaceId: string;
  workspaceName: string;
  invitedBy: string;
  email: string;
  state: 'open' | 'used' | 'expired';
}

export const CreateInviteInput = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ').max(200).or(z.literal('')).default(''),
  role: z.enum(['owner', 'member']).default('member'),
});
export type CreateInviteInput = z.infer<typeof CreateInviteInput>;

export const RenameWorkspaceInput = z.object({ name: z.string().trim().min(1, 'Nhập tên workspace').max(80) });
export const SetRoleInput = z.object({ role: z.enum(['owner', 'member']) });
