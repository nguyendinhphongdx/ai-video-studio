import { NextResponse } from 'next/server';

import { sql } from 'drizzle-orm';
import { orm } from '@/server/orm';
import { publicRoute } from '@/server/http/route';
import { prefsService } from '@/server/modules/prefs/prefs.service';

/** How long without a worker heartbeat before the worker counts as down (it beats every 5 s). */
const WORKER_STALE_MS = 60_000;

/**
 * For the container healthcheck and uptime monitors; public, and says nothing about any workspace. 200 when the database
 * answers; `worker` tells whether background jobs are being picked up.
 */
export const GET = publicRoute(async () => {
  await orm().get(sql`SELECT 1`);
  const seen = await prefsService.workerSeenAt();
  const worker = seen !== null && Date.now() - seen < WORKER_STALE_MS;
  return NextResponse.json({ ok: true, worker }, { headers: { 'cache-control': 'no-store' } });
});
