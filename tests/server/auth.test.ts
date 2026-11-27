// Accounts on a throw-away database: sign-up, sign-in, sessions, and the API gate.
import fs from 'node:fs';

import { NextRequest } from 'next/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-auth-test-${process.pid}`;
});

type Auth = typeof import('@/server/modules/auth/auth.service');
let auth: Auth;
let http: typeof import('@/server/http/route');
let context: typeof import('@/server/context');

beforeAll(async () => {
  fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  auth = await import('@/server/modules/auth/auth.service');
  http = await import('@/server/http/route');
  context = await import('@/server/context');
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

const req = (token?: string) => new NextRequest('http://localhost/api/v1/x', { headers: token ? { cookie: `avs_session=${token}` } : {} });

describe('accounts', () => {
  it('makes the first account the system admin, with its own workspace that may use the shared keys', async () => {
    const { token, user } = await auth.authService.signUp({ email: 'a@x.vn', password: 'secret-123', name: 'An' });
    expect(user.isAdmin).toBe(true);
    const s = (await auth.authService.authenticate(token))!;
    expect(s.role).toBe('owner');
    expect(s.workspace.usesSharedKeys).toBe(true);
  });

  it('gives later accounts their own workspace without the shared keys, and no admin rights', async () => {
    const { token, user } = await auth.authService.signUp({ email: 'b@x.vn', password: 'secret-123', name: 'Bình' });
    expect(user.isAdmin).toBe(false);
    const s = (await auth.authService.authenticate(token))!;
    expect(s.workspace.usesSharedKeys).toBe(false);
    expect(s.workspace.name).toContain('Bình');
  });

  it('refuses a second account on the same email', async () => {
    await expect(async () => auth.authService.signUp({ email: 'a@x.vn', password: 'secret-123', name: 'Khác' })).rejects.toThrow(/đã có tài khoản/);
  });

  it('signs in with the right password only, with one message for a wrong password or an unknown email', async () => {
    expect((await auth.authService.logIn({ email: 'a@x.vn', password: 'secret-123' })).user.email).toBe('a@x.vn');
    await expect(async () => auth.authService.logIn({ email: 'a@x.vn', password: 'wrong-pass' })).rejects.toThrow('Email hoặc mật khẩu không đúng.');
    await expect(async () => auth.authService.logIn({ email: 'nobody@x.vn', password: 'secret-123' })).rejects.toThrow('Email hoặc mật khẩu không đúng.');
  });

  it('stores passwords hashed, never in the clear', async () => {
    const { db } = await import('@/server/db');
    const row = db().prepare("SELECT password_hash FROM users WHERE email = 'a@x.vn'").get() as { password_hash: string };
    expect(row.password_hash).toMatch(/^scrypt\$/);
    expect(row.password_hash).not.toContain('secret-123');
  });

  it('ends the session on sign-out', async () => {
    const { token } = await auth.authService.logIn({ email: 'a@x.vn', password: 'secret-123' });
    expect(await auth.authService.authenticate(token)).not.toBeNull();
    await auth.authService.logOut(token);
    expect(await auth.authService.authenticate(token)).toBeNull();
    expect(await auth.authService.authenticate('made-up-token')).toBeNull();
  });
});

describe('the API gate', () => {
  it('answers 401 without a session and runs the handler in the caller’s workspace with one', async () => {
    const handler = http.route(async () => ({ ws: context.ctx().workspace.name }));
    const ctx = { params: Promise.resolve({}) };
    const out = await handler(req(), ctx);
    expect(out.status).toBe(401);
    const { token } = await auth.authService.logIn({ email: 'b@x.vn', password: 'secret-123' });
    const ok = await handler(req(token), ctx);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ws: 'Workspace của Bình' });
  });

  it('lets public routes through without a session', async () => {
    const handler = http.publicRoute(async () => ({ ok: 'yes' }));
    expect((await handler(req(), { params: Promise.resolve({}) })).status).toBe(200);
  });
});
