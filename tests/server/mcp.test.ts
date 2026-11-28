// Connection codes and the MCP endpoint on a throw-away database.
import fs from 'node:fs';

import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-mcp-test-${process.pid}`;
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => false } }));

type Scope = import('@/server/context').RequestContext;

let A: Scope;
let B: Scope;
let run: <T>(s: Scope, fn: () => T) => T;
let mcp: typeof import('@/server/modules/mcp/mcp.service').mcpService;
let db: typeof import('@/server/db');

beforeAll(async () => {
  fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  const { authService } = await import('@/server/modules/auth/auth.service');
  run = (await import('@/server/context')).runWithContext;
  mcp = (await import('@/server/modules/mcp/mcp.service')).mcpService;
  db = await import('@/server/db');
  A = (await authService.authenticate((await authService.signUp({ email: 'a@x.vn', password: 'secret-123', name: 'An' })).token))!;
  B = (await authService.authenticate((await authService.signUp({ email: 'b@x.vn', password: 'secret-123', name: 'Bình' })).token))!;
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

const make = (name: string, level: 'read' | 'edit' | 'full' = 'edit') => run(A, () => mcp.createCode({ name, level }));

describe('connection codes', () => {
  it('acts as the owner of the workspace that made it, and is stored only as a hash', async () => {
    const { code, view } = await make('laptop');
    expect(view.expiresAt).not.toBeNull();
    const session = await mcp.authenticate(code);
    expect(session).toMatchObject({ codeId: view.id, level: 'edit' });
    expect(session!.context.workspaceId).toBe(A.workspaceId);
    expect(JSON.stringify(db.rowsOf(await db.orm().execute(sql`SELECT * FROM mcp_codes`)))).not.toContain(code);
  });

  it('refuses a wrong, revoked or expired code', async () => {
    const { code, view } = await make('old');
    expect(await mcp.authenticate(`${code}x`)).toBeNull();
    expect(await mcp.authenticate(undefined)).toBeNull();
    await db.orm().execute(sql`UPDATE mcp_codes SET expires_at = now() - interval '1 minute' WHERE id = ${view.id}`);
    expect(await mcp.authenticate(code)).toBeNull();
    const next = await make('revoked');
    await run(A, () => mcp.revoke(next.view.id));
    expect(await mcp.authenticate(next.code)).toBeNull();
    expect((await run(A, () => mcp.codes())).map((c) => c.id)).not.toContain(next.view.id);
  });

  it('stops working when its maker is no longer the owner', async () => {
    const { code } = await make('demoted');
    await db.orm().execute(sql`UPDATE memberships SET role = 'member' WHERE workspace_id = ${A.workspaceId}`);
    expect(await mcp.authenticate(code)).toBeNull();
    await db.orm().execute(sql`UPDATE memberships SET role = 'owner' WHERE workspace_id = ${A.workspaceId}`);
    expect(await mcp.authenticate(code)).not.toBeNull();
  });

  it('is invisible to another workspace, and members cannot manage codes', async () => {
    const { view } = await make('mine');
    expect(await run(B, () => mcp.codes())).toEqual([]);
    await expect(run(B, () => mcp.revoke(view.id))).rejects.toThrow(/Không tìm thấy/);
    await run(A, () => mcp.record(view.id, 'get_channel', 'Xem thông tin kênh', true));
    expect(await run(A, () => mcp.calls(view.id))).toHaveLength(1);
    expect(await run(B, () => mcp.calls(view.id))).toEqual([]);
    await expect(run({ ...A, role: 'member' }, () => mcp.createCode({ name: 'no' }))).rejects.toThrow(/chủ workspace/);
  });
});
