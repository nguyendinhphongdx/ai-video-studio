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

describe('the endpoint', () => {
  const post = async (code: string | null, body: unknown) => {
    const { POST } = await import('@/app/api/mcp/route');
    const res = await POST(new Request('http://studio.test/api/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18', ...(code ? { authorization: `Bearer ${code}` } : {}) }, body: JSON.stringify(body) }));
    const raw = await res.text();
    const data = /^data: (.*)$/m.exec(raw)?.[1] ?? raw;
    return { status: res.status, body: data ? JSON.parse(data) : null };
  };
  const names = async (code: string) => ((await post(code, { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })).body.result.tools as { name: string }[]).map((t) => t.name);
  const callTool = async (code: string, name: string, args: Record<string, unknown>) => {
    const { result, error } = (await post(code, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: args } })).body;
    return { isError: Boolean(error ?? result.isError), text: error?.message ?? (result.content[0].text as string) };
  };
  const projectIn = async (s: Scope, name: string) => {
    const { channelService } = await import('@/server/modules/channel/channel.service');
    const { NEW_CHANNEL } = await import('@/features/channel/services/channel.api');
    return run(s, async () => (await channelService.create({ ...NEW_CHANNEL, name })).id);
  };

  it('asks for a code', async () => {
    expect((await post(null, { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status).toBe(401);
    expect((await post('avs_mcp_wrong', { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status).toBe(401);
  });

  it('offers each level its own tools, and nothing above it even by name', async () => {
    const read = (await make('r', 'read')).code;
    const edit = (await make('e', 'edit')).code;
    const full = (await make('f', 'full')).code;
    const [r, e, f] = [await names(read), await names(edit), await names(full)];
    expect(r).toContain('list_projects');
    expect(r).not.toContain('update_channel');
    expect(e).toEqual(expect.arrayContaining([...r, 'update_channel', 'approve_scenes']));
    expect(e).not.toContain('produce_video');
    expect(e).not.toContain('remove_scene');
    expect(f).toEqual(expect.arrayContaining([...e, 'produce_video', 'delete_episode']));
    expect(f).not.toContain('ai_fix_scene');
    expect((await callTool(read, 'update_channel', { projectId: 'x', name: 'y' })).isError).toBe(true);
  });

  it('works in the project it is given, only inside its workspace, and records what it did', async () => {
    const mine = await projectIn(A, 'Kênh của An');
    const theirs = await projectIn(B, 'Kênh của Bình');
    const { code, view } = await make('w', 'edit');
    expect((await callTool(code, 'list_projects', {})).text).toContain('Kênh của An');
    expect((await callTool(code, 'list_projects', {})).text).not.toContain('Kênh của Bình');
    expect(await callTool(code, 'update_channel', { projectId: mine, description: 'Truyện kể' })).toMatchObject({ isError: false });
    expect((await callTool(code, 'get_channel', { projectId: mine })).text).toContain('Truyện kể');
    expect((await callTool(code, 'get_channel', { projectId: theirs })).isError).toBe(true);
    expect((await callTool(code, 'get_channel', {})).isError).toBe(true);
    const calls = await run(A, () => mcp.calls(view.id));
    expect(calls.map((c) => [c.tool, c.ok])).toContainEqual(['update_channel', true]);
    expect(calls.map((c) => [c.tool, c.ok])).toContainEqual(['get_channel', false]);
  });

  it('limits how fast one code may call', async () => {
    const { allowed, PER_MINUTE } = await import('@/server/modules/mcp/rate-limit');
    for (let i = 0; i < PER_MINUTE; i++) expect(allowed('fast', 1000)).toBe(true);
    expect(allowed('fast', 1000)).toBe(false);
    expect(allowed('other', 1000)).toBe(true);
    expect(allowed('fast', 62_000)).toBe(true);
  });

  it('creates, edits and removes a project by name, and keeps final decisions for a full code', async () => {
    const edit = (await make('data', 'edit')).code;
    const full = (await make('data-full', 'full')).code;
    const made = await callTool(edit, 'create_project', { name: 'Dự án thử' });
    expect(made.isError).toBe(false);
    const projectId = /projectId (\w+)/.exec(made.text)![1]!;
    expect(await names(edit)).toEqual(expect.arrayContaining(['reject_video', 'save_series_memory', 'reorder_series_episodes', 'use_latest_series', 'upgrade_skill']));
    expect(await names(edit)).not.toContain('approve_video');
    expect((await callTool(full, 'delete_project', { projectId, confirmName: 'dự án thử' })).isError).toBe(true);
    expect((await callTool(full, 'delete_project', { projectId, confirmName: 'Dự án thử' })).isError).toBe(false);
    expect((await callTool(edit, 'list_projects', {})).text).not.toContain(projectId);
    expect((await callTool(edit, 'list_running_work', {})).text).toContain('Không có việc nào');
  });

  it('reads and refuses by project for the new reading tools', async () => {
    const mine = await projectIn(A, 'Chi phí');
    const theirs = await projectIn(B, 'Của B');
    const { code } = await make('cost', 'read');
    expect((await callTool(code, 'get_cost_summary', { projectId: mine })).text).toContain('totals');
    expect((await callTool(code, 'get_cost_summary', { projectId: theirs })).isError).toBe(true);
    expect((await callTool(code, 'get_publish_kit', { projectId: mine, episodeId: 'nope' })).isError).toBe(true);
    expect((await callTool(code, 'get_series_memory', { projectId: mine, seriesId: 'nope' })).isError).toBe(true);
  });

  it('gives file links that open one thing, once or for an hour, and stop with the code', async () => {
    const projectId = await projectIn(A, 'Gửi file');
    const { code, view } = await make('files', 'edit');
    const link = async (purpose: string) => /http:\/\/studio\.test(\/api\/mcp\/upload\/[\w-]+)/.exec((await callTool(code, 'request_upload', { projectId, purpose })).text)![1]!;
    const { uploadLinkRoute, viewLinkRoute } = await import('@/server/http/mcp-links');
    const send = async (path: string, type: string) => {
      const form = new FormData();
      form.set('file', new File([new Uint8Array([1, 2, 3])], 'x.png', { type }));
      return (await uploadLinkRoute(new Request(`http://studio.test${path}`, { method: 'POST', body: form }), { params: Promise.resolve({ token: path.split('/').pop()! }) })).status;
    };
    const open = async (token: string) => (await viewLinkRoute(new Request('http://studio.test/x'), { params: Promise.resolve({ token }) })).status;

    const logo = await link('logo');
    expect(await send(logo, 'text/plain')).toBe(400);
    expect(await send(logo, 'image/png')).toBe(200);
    expect(await send(logo, 'image/png')).toBe(404);
    expect(await send('/api/mcp/upload/made-up', 'image/png')).toBe(404);

    const { channelService } = await import('@/server/modules/channel/channel.service');
    const { linkService } = await import('@/server/modules/mcp/links.service');
    const logoPath = (await run(A, () => channelService.get(projectId))).logoPath!;
    const mine = await run(A, () => linkService.view(view.id, logoPath));
    expect(await open(mine.token)).toBe(200);
    expect(await open(`${mine.token}x`)).toBe(404);
    // A link made for a file of another workspace still does not open it.
    const theirs = await projectIn(B, 'Của B có logo');
    await run(B, () => channelService.setLogo(theirs, new File([new Uint8Array([1])], 'b.png', { type: 'image/png' })));
    const stolen = await run(A, () => linkService.view(view.id, `channels/${theirs}/logo/any.png`));
    expect(await open(stolen.token)).toBe(404);
    await db.orm().execute(sql`UPDATE mcp_uploads SET expires_at = now() - interval '1 minute' WHERE purpose = 'view'`);
    expect(await open(mine.token)).toBe(404);

    const unused = await link('avatar');
    await run(A, () => mcp.revoke(view.id));
    expect(await send(unused, 'image/png')).toBe(404);
  });

  it('goes from nothing to a scene whose picture the AI can look at', async () => {
    const { code } = await make('e2e', 'edit');
    const made = await callTool(code, 'create_project', { name: 'Truyện tranh', marketSkillId: 'picture-story' });
    expect(made).toMatchObject({ isError: false });
    const projectId = /projectId (\w+)/.exec(made.text)![1]!;
    const episode = await callTool(code, 'create_episode', { projectId, topic: 'Cậu bé và quả sen' });
    expect(episode).toMatchObject({ isError: false });
    const episodeId = /id (\w+), skill/.exec(episode.text)![1]!;
    const details = JSON.parse((await callTool(code, 'get_episode', { projectId, episodeId })).text) as { scenes: unknown[] };
    expect(details.scenes).toEqual([]);
    // A planned episode only gets scenes from write_script (a paid job); stand in for its result.
    await db.orm().execute(sql`UPDATE episodes SET status = 'script_review' WHERE id = ${episodeId}`);
    const added = await callTool(code, 'add_scene', { projectId, episodeId, block: 'remotion/picture', narration: 'Ngày xưa có một đầm sen.' });
    expect(added).toMatchObject({ isError: false });
    const sceneId = /id (\w+)\)/.exec(added.text)![1]!;
    expect((await callTool(code, 'view_scene_picture', { projectId, episodeId, sceneId })).text).toMatch(/chưa có ảnh/);

    const asked = await callTool(code, 'request_upload', { projectId, purpose: 'scene_picture', episodeId, sceneId });
    const token = /\/api\/mcp\/upload\/([\w-]+)/.exec(asked.text)![1]!;
    const { uploadLinkRoute } = await import('@/server/http/mcp-links');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    const form = new FormData();
    form.set('file', new File([new Uint8Array(png)], 'a.png', { type: 'image/png' }));
    const sent = await uploadLinkRoute(new Request('http://studio.test/x', { method: 'POST', body: form }), { params: Promise.resolve({ token }) });
    expect(sent.status).toBe(200);

    const res = (await post(code, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'view_scene_picture', arguments: { projectId, episodeId, sceneId } } })).body.result;
    expect(res.content.map((c: { type: string }) => c.type)).toEqual(['text', 'image']);
    expect(res.content[0].text).toContain('http://studio.test/api/mcp/media/');
    expect((await callTool(code, 'get_video', { projectId, episodeId })).text).toMatch(/chưa được dựng/);
  });
});
