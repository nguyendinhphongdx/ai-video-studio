import { z } from 'zod';

import type { AccessLevel } from '@/core/assistant/tool';

export const ACCESS_LEVELS = ['read', 'edit', 'full'] as const satisfies readonly AccessLevel[];

export const CreateCodeInput = z.object({
  name: z.string().trim().min(1, 'Đặt tên cho mã').max(60),
  level: z.enum(ACCESS_LEVELS).default('edit'),
  /** Days until the code stops working; null = never. */
  expiresInDays: z.number().int().min(1).max(3650).nullable().default(90),
});
export type CreateCodeInput = z.input<typeof CreateCodeInput>;

export interface McpCodeView {
  id: string;
  name: string;
  level: AccessLevel;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  /** revoked codes are not listed; an expired one is, so the person knows why it stopped. */
  expired: boolean;
}

export interface McpCallView {
  id: number;
  tool: string;
  summary: string;
  ok: boolean;
  at: string;
}
