// Invite links, members and roles on a throw-away database.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-members-test-${process.pid}`;
});

type Ctx = import('@/server/context').RequestContext;
let auth: typeof import('@/server/modules/auth/auth.service');
let ws: typeof import('@/server/modules/workspace/workspace.service');
let run: <T>(c: Ctx, fn: () => T) => T;
/** A person's context from a fresh sign-in (their session's current workspace). */
let as: (email: string) => Promise<Ctx>;
let token: (email: string) => Promise<string>;

beforeAll(async () => {
  fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  auth = await import('@/server/modules/auth/auth.service');
  ws = await import('@/server/modules/workspace/workspace.service');
  run = (await import('@/server/context')).runWithContext;
  token = async (email) => (await auth.authService.logIn({ email, password: 'secret-123' })).token;
  as = async (email) => (await auth.authService.authenticate(await token(email)))!;
  for (const [email, name] of [['owner@x.vn', 'Chủ'], ['ban@x.vn', 'Bạn'], ['la@x.vn', 'Lạ']] as const) await auth.authService.signUp({ email, password: 'secret-123', name, workspaceName: `WS ${name}` });
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

describe('invites and members', () => {
  let link = '';

  it('lets the owner make an invite link, and members not', async () => {
    const owner = await as('owner@x.vn');
    link = (await run(owner, () => ws.workspaceService.createInvite({ email: '', role: 'member' }))).token;
    expect(link.length).toBeGreaterThan(20);
    expect(await run(owner, () => ws.workspaceService.invites())).toHaveLength(1);
    expect(await ws.workspaceService.preview(link)).toMatchObject({ workspaceName: 'WS Chủ', invitedBy: 'Chủ', state: 'open' });
    // The owner opening their own link does not use it up.
    await expect(async () => run(owner, () => ws.workspaceService.accept(link))).rejects.toThrow(/đã ở trong workspace/);
    expect((await ws.workspaceService.preview(link)).state).toBe('open');
  });

  it('joins the invited person and moves their session into the workspace; the link then is used', async () => {
    const t = await token('ban@x.vn');
    const me = await run((await auth.authService.authenticate(t))!, () => ws.workspaceService.accept(link));
    expect(me.workspace.name).toBe('WS Chủ');
    expect(me.role).toBe('member');
    expect(me.workspaces.map((w) => w.name).sort()).toEqual(['WS Bạn', 'WS Chủ']);
    // The same session now opens in the joined workspace.
    expect((await auth.authService.authenticate(t))!.workspace.name).toBe('WS Chủ');
    const stranger = await as('la@x.vn');
    await expect(async () => run(stranger, () => ws.workspaceService.accept(link))).rejects.toThrow(/đã được dùng/);
    expect((await ws.workspaceService.preview(link)).state).toBe('used');
  });

  it('keeps an invite for one email to that email only', async () => {
    const owner = await as('owner@x.vn');
    const forBan = (await run(owner, () => ws.workspaceService.createInvite({ email: 'someone@x.vn', role: 'member' }))).token;
    const stranger = await as('la@x.vn');
    await expect(async () => run(stranger, () => ws.workspaceService.accept(forBan))).rejects.toThrow(/dành cho someone@x.vn/);
  });

  it('refuses member-only people the owner tools', async () => {
    // A fresh sign-in opens the person's own workspace; move the session into WS Chủ first.
    const t = await token('ban@x.vn');
    const own = (await auth.authService.authenticate(t))!;
    const target = own.user && (await run(own, () => auth.authService.me())).workspaces.find((w) => w.name === 'WS Chủ')!;
    await run(own, () => auth.authService.switchWorkspace(target.id));
    const member = (await auth.authService.authenticate(t))!;
    expect(member.workspace.name).toBe('WS Chủ');
    expect(member.role).toBe('member');
    await expect(async () => run(member, () => ws.workspaceService.createInvite({ email: '', role: 'member' }))).rejects.toThrow(/Chỉ chủ workspace/);
    await expect(async () => run(member, () => ws.workspaceService.rename('Đổi'))).rejects.toThrow(/Chỉ chủ workspace/);
    expect((await run(member, () => ws.workspaceService.members())).map((m) => m.email).sort()).toEqual(['ban@x.vn', 'owner@x.vn']);
  });

  it('always keeps one owner, and lets the owner promote, demote and remove others', async () => {
    const owner = await as('owner@x.vn');
    await expect(async () => run(owner, () => ws.workspaceService.setRole(owner.userId, 'member'))).rejects.toThrow(/ít nhất một chủ/);
    await expect(async () => run(owner, () => ws.workspaceService.leave())).rejects.toThrow();
    const ban = (await run(owner, () => ws.workspaceService.members())).find((m) => m.email === 'ban@x.vn')!;
    expect((await run(owner, () => ws.workspaceService.setRole(ban.userId, 'owner'))).find((m) => m.userId === ban.userId)?.role).toBe('owner');
    await run(owner, () => ws.workspaceService.setRole(ban.userId, 'member'));
    expect((await run(owner, () => ws.workspaceService.removeMember(ban.userId))).map((m) => m.email)).toEqual(['owner@x.vn']);
    // Removed: Bạn's next request falls back to their own workspace.
    expect((await as('ban@x.vn')).workspace.name).toBe('WS Bạn');
  });

  it('lets a member leave a workspace they joined, but not their only one', async () => {
    const owner = await as('owner@x.vn');
    const again = (await run(owner, () => ws.workspaceService.createInvite({ email: '', role: 'member' }))).token;
    const t = await token('la@x.vn');
    await run((await auth.authService.authenticate(t))!, () => ws.workspaceService.accept(again));
    const la = (await auth.authService.authenticate(t))!;
    expect(la.workspace.name).toBe('WS Chủ');
    await run(la, () => ws.workspaceService.leave());
    const after = (await auth.authService.authenticate(t))!;
    expect(after.workspace.name).toBe('WS Lạ');
    await expect(async () => run(after, () => ws.workspaceService.leave())).rejects.toThrow(/duy nhất/);
  });
});
