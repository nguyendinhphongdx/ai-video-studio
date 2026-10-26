import type { PermissionMode } from '@/core/assistant/tool';
import type { AssistantMessage } from '@/core/ports';
import { api } from '@/lib/api/client';
import type { ThreadView } from '@/server/modules/assistant/assistant.service';
import type { AssistantThread } from '@/server/modules/assistant/assistant.repository';

export type { AssistantMessage, AssistantThread, PermissionMode, ThreadView };

export interface Focus {
  route: string;
  episodeId: string | null;
  seriesId: string | null;
  sceneId: string | null;
  skillId: string | null;
}

export const assistantApi = {
  threads: (channelId: string) => api<AssistantThread[]>(`/assistant/threads?channelId=${encodeURIComponent(channelId)}`),
  create: (channelId: string, mode: PermissionMode) => api<ThreadView>('/assistant/threads', { body: { channelId, mode } }),
  get: (id: string) => api<ThreadView>(`/assistant/threads/${id}`),
  send: (id: string, text: string, focus: Focus) => api<ThreadView>(`/assistant/threads/${id}/messages`, { body: { text, focus } }),
  decide: (id: string, messageId: number, approve: boolean) => api<ThreadView>(`/assistant/threads/${id}/decide`, { body: { messageId, approve } }),
  setMode: (id: string, mode: PermissionMode) => api<ThreadView>(`/assistant/threads/${id}/mode`, { method: 'PUT', body: { mode } }),
  remove: (id: string) => api<{ ok: true }>(`/assistant/threads/${id}`, { method: 'DELETE' }),
};

export const MODE_INFO: Record<PermissionMode, { label: string; hint: string }> = {
  ask: { label: 'Hỏi', hint: 'Hỏi bạn trước mọi thay đổi' },
  auto: { label: 'Auto', hint: 'Tự sửa nội dung; hỏi trước khi tốn tiền hoặc xoá' },
  bypass: { label: 'Bypass', hint: 'Làm hết, không hỏi (cẩn thận, có thể tốn tiền)' },
};
