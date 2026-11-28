import type { ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';

/** Links only exist for an outside caller: they are built from the address it reached the studio at. */
export function callerOf(ctx: ToolContext) {
  if (!ctx.caller) throw new UserFacingError('Công cụ này chỉ dùng qua kết nối MCP.');
  return ctx.caller;
}
