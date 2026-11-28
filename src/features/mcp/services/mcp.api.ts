import { api } from '@/lib/api/client';
import type { CreateCodeInput, McpCallView, McpCodeView } from '@/server/modules/mcp/mcp.types';

export type { CreateCodeInput, McpCallView, McpCodeView };

export const mcpKeys = { codes: ['mcp', 'codes'] as const, calls: (id: string) => ['mcp', 'calls', id] as const };

export const mcpApi = {
  codes: () => api<McpCodeView[]>('/mcp/codes'),
  create: (input: CreateCodeInput) => api<{ code: string; view: McpCodeView }>('/mcp/codes', { body: input }),
  revoke: (id: string) => api(`/mcp/codes/${id}`, { method: 'DELETE' }),
  calls: (id: string) => api<McpCallView[]>(`/mcp/codes/${id}`),
};
