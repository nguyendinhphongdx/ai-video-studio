import { z } from 'zod';

export type Role = 'owner' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  /** System admin: the first account; owns the shared AI keys and the price book. */
  isAdmin: boolean;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  /** May fall back to the system admin's AI keys (off for self-registered workspaces until the admin allows it). */
  usesSharedKeys: boolean;
  /** Who created it. */
  userId: string | null;
  createdAt: string;
}

export interface Membership {
  workspaceId: string;
  userId: string;
  role: Role;
  createdAt: string;
}

/** What the browser gets about the signed-in person. */
export interface MeView {
  user: User;
  workspace: Workspace;
  role: Role;
  workspaces: (Workspace & { role: Role })[];
}

const email = z.string().trim().toLowerCase().email('Email không hợp lệ').max(200);
const password = z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự').max(200);

export const SignUpInput = z.object({
  email,
  password,
  name: z.string().trim().min(1, 'Nhập tên của bạn').max(80),
  /** Optional: the new workspace's name (a default is made from the person's name). */
  workspaceName: z.string().trim().max(80).optional(),
});
export type SignUpInput = z.infer<typeof SignUpInput>;

export const LogInInput = z.object({ email, password: z.string().min(1).max(200) });
export type LogInInput = z.infer<typeof LogInInput>;

export const SwitchWorkspaceInput = z.object({ workspaceId: z.string().min(1).max(40) });
