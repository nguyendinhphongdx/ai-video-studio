// Who a paid call belongs to. The worker, the assistant and the API routes open a scope; adapters read it when they
// record a call, so channel, video and job do not have to be passed through every layer.
import { AsyncLocalStorage } from 'node:async_hooks';

export interface UsageScope {
  channelId?: string;
  seriesId?: string;
  episodeId?: string;
  sceneId?: string;
  jobId?: string;
  threadId?: string;
  purpose?: string;
}

const g = globalThis as unknown as { __avsUsageScope?: AsyncLocalStorage<UsageScope> };
const als = (g.__avsUsageScope ??= new AsyncLocalStorage<UsageScope>());

export const withUsageScope = <T>(scope: UsageScope, fn: () => T): T => als.run({ ...als.getStore(), ...scope }, fn);
export const currentUsageScope = (): UsageScope => als.getStore() ?? {};
