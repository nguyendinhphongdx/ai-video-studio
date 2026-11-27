// Server tests: open the test file's own in-memory Postgres (PGlite), apply the migrations, and make the one test
// account and workspace that ctx() falls back to. Imports are lazy, inside the hook, so a test file's vi.hoisted
// environment (AVS_DATA_DIR and so on) is in place before any server module reads it.
import { afterAll, beforeAll, expect } from 'vitest';

const isServerTest = () => /[\\/]tests[\\/]server[\\/]/.test(expect.getState().testPath ?? '');

beforeAll(async () => {
  if (!isServerTest()) return;
  const { dbReady, orm } = await import('@/server/db');
  const { makeContext } = await import('@/server/context');
  const { memberships, users, workspaces } = await import('@/server/schema');
  await dbReady();
  if (process.env.AVS_TEST_NO_ACCOUNT) return;
  const at = new Date().toISOString();
  const user = { id: 'test-user', email: 'test@local', name: 'Test', isAdmin: true, createdAt: at };
  const workspace = { id: 'test-ws', name: 'Test', usesSharedKeys: true, userId: user.id, createdAt: at };
  await orm().insert(users).values({ ...user, passwordHash: 'scrypt$00$00' });
  await orm().insert(workspaces).values(workspace);
  await orm().insert(memberships).values({ workspaceId: workspace.id, userId: user.id, role: 'owner', createdAt: at });
  (globalThis as { __avsTestCtx?: unknown }).__avsTestCtx = makeContext(user, workspace, 'owner');
});

afterAll(async () => {
  // Workers are reused across files: keep one file's opt-out from leaking into the next.
  delete process.env.AVS_TEST_NO_ACCOUNT;
  if (!isServerTest()) return;
  await (await import('@/server/db')).closeDb();
});
