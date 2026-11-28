import { ctx } from '@/server/context';

import { changesFeed } from './changes.stream';

export const changesService = {
  /** The live signals of the current workspace, as server-sent events. */
  feed(lastEventId: number, token: string | undefined, signal: AbortSignal): Response {
    return changesFeed({ workspaceId: ctx().workspaceId, token, lastEventId: Number.isFinite(lastEventId) ? lastEventId : 0, signal });
  },
};
