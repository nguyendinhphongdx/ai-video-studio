// AI keys per workspace, with the system's shared keys as a fallback the admin allows; who may change what.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-keys-test-${process.pid}`;
  for (const k of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'AVS_MODEL']) delete process.env[k];
});

type Ctx = import('@/server/context').RequestContext;
let auth: typeof import('@/server/modules/auth/auth.service');
let settings: typeof import('@/server/modules/settings/settings.service');
let usage: typeof import('@/server/modules/usage/usage.service');
let ws: typeof import('@/server/modules/workspace/workspace.service');
let run: <T>(c: Ctx, fn: () => T) => T;
const fresh = async (email: string) => (await auth.authService.authenticate((await auth.authService.logIn({ email, password: 'secret-123' })).token))!;

beforeAll(async () => {
  fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  auth = await import('@/server/modules/auth/auth.service');
  settings = await import('@/server/modules/settings/settings.service');
  usage = await import('@/server/modules/usage/usage.service');
  ws = await import('@/server/modules/workspace/workspace.service');
  run = (await import('@/server/context')).runWithContext;
  await auth.authService.signUp({ email: 'admin@x.vn', password: 'secret-123', name: 'Admin' });
  await auth.authService.signUp({ email: 'khach@x.vn', password: 'secret-123', name: 'Khách' });
  // The admin puts the shared keys in.
  const admin = await fresh('admin@x.vn');
  await run(admin, () => settings.settingsService.shared.saveLlm({ provider: 'anthropic', model: 'claude-x', apiKey: 'sk-shared-key-123456' }));
  await run(admin, () => settings.settingsService.shared.saveImage({ provider: 'openai', apiKey: 'sk-shared-image-123456' }));
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

describe('AI keys per workspace', () => {
  it('lets the admin workspace use the shared keys (it may by default)', async () => {
    const admin = await fresh('admin@x.vn');
    const llm = await run(admin, () => settings.settingsService.llm());
    expect(llm.apiKey).toBe('sk-shared-key-123456');
    expect((await run(admin, () => settings.settingsService.publicLlm())).usingShared).toBe(true);
  });

  it('gives a self-registered workspace no AI until it adds its own key or the admin allows the shared one', async () => {
    const khach = await fresh('khach@x.vn');
    expect((await run(khach, () => settings.settingsService.llm())).apiKey).toBe('');
    expect((await run(khach, () => settings.settingsService.image())).apiKey).toBe('');
    const pub = await run(khach, () => settings.settingsService.publicLlm());
    expect(pub).toMatchObject({ ready: false, usingShared: false, sharedAllowed: false });
  });

  it('uses the shared keys once the admin allows the workspace, and its own key over them', async () => {
    const admin = await fresh('admin@x.vn');
    let khach = await fresh('khach@x.vn');
    await run(admin, () => auth.authService.setSharedKeys(khach.workspaceId, true));
    khach = await fresh('khach@x.vn');
    expect((await run(khach, () => settings.settingsService.llm())).apiKey).toBe('sk-shared-key-123456');
    await run(khach, () => settings.settingsService.saveLlm({ provider: 'gemini', model: 'gemini-x', apiKey: 'own-gemini-key-123456' }));
    const llm = await run(khach, () => settings.settingsService.llm());
    expect([llm.provider, llm.apiKey]).toEqual(['gemini', 'own-gemini-key-123456']);
    expect((await run(khach, () => settings.settingsService.publicLlm())).usingShared).toBe(false);
    // The workspace's own Gemini key also serves its voices; the admin's workspace still uses the shared keys.
    expect(await run(khach, () => settings.settingsService.googleKey())).toBe('own-gemini-key-123456');
    expect((await run(admin, () => settings.settingsService.llm())).apiKey).toBe('sk-shared-key-123456');
  });

  it('never shows a key in full', async () => {
    const khach = await fresh('khach@x.vn');
    const pub = await run(khach, () => settings.settingsService.publicLlm());
    expect(pub.apiKey).not.toContain('own-gemini-key-123456');
  });
});

describe('who may change what', () => {
  it('keeps the shared keys, prices and the shared-key switch to the system admin', async () => {
    const khach = await fresh('khach@x.vn');
    await expect(async () => run(khach, () => settings.settingsService.shared.saveLlm({ apiKey: 'x' }))).rejects.toThrow(/quản trị hệ thống/);
    await expect(async () => run(khach, () => settings.settingsService.shared.publicLlm())).rejects.toThrow(/quản trị hệ thống/);
    await expect(async () => run(khach, () => usage.usageService.resetPrices())).rejects.toThrow(/quản trị hệ thống/);
    await expect(async () => run(khach, () => auth.authService.setSharedKeys(khach.workspaceId, true))).rejects.toThrow(/quản trị hệ thống/);
    await expect(async () => run(khach, () => auth.authService.allWorkspaces())).rejects.toThrow(/quản trị hệ thống/);
  });

  it('keeps a workspace’s keys and budgets to its owner', async () => {
    // Khách invites the admin into their workspace as a plain member.
    const khach = await fresh('khach@x.vn');
    const link = (await run(khach, () => ws.workspaceService.createInvite({ email: '', role: 'member' }))).token;
    const t = (await auth.authService.logIn({ email: 'admin@x.vn', password: 'secret-123' })).token;
    await run((await auth.authService.authenticate(t))!, () => ws.workspaceService.accept(link));
    const asMember = (await auth.authService.authenticate(t))!;
    expect(asMember.role).toBe('member');
    await expect(async () => run(asMember, () => settings.settingsService.saveLlm({ apiKey: 'x' }))).rejects.toThrow(/Chỉ chủ workspace/);
    await expect(async () => run(asMember, () => usage.usageService.saveBudget({ scope: 'global', channelId: null, period: 'month', limitUsd: 5, mode: 'warn', alertPct: 80 }))).rejects.toThrow(/Chỉ chủ workspace/);
    // As a member they still use the workspace's connection (its own key), not their own workspace's.
    expect((await run(asMember, () => settings.settingsService.llm())).apiKey).toBe('own-gemini-key-123456');
  });
});
