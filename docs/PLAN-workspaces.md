# Accounts and workspaces

Goal: the app can be deployed on the internet. Every person signs in; every piece of data belongs to a workspace; people can invite others into a workspace.

## Decisions (from the owner, 2026-11-27)

- **Sign-up is open.** Anyone can create an account and gets an empty workspace of their own.
- **Invites.** The owner of a workspace invites people by link; an invited person joins that workspace (with a new or an existing account).
- **Two roles per workspace:** `owner` (everything: members, invites, AI keys, budgets, delete) and `member` (projects, episodes, characters, the assistant; no keys, budgets or members).
- **AI keys: both.** The system admin keeps shared keys (today's settings). A workspace may enter its own keys, which then win. A self-registered workspace may use the shared keys only when the system admin allows it (off by default), so strangers cannot spend the admin's money.
- **Existing data** goes into the first account's workspace: the first account to sign up becomes the system admin and gets today's projects, costs and keys.

## Data model (append-only migrations)

- `users` (id, email unique, name, password_hash scrypt, is_admin, created_at)
- `sessions` (token_hash, user_id, expires_at); cookie `avs_session`, httpOnly, sameSite=lax, secure in production, 30 days
- `workspaces` (id, name, uses_shared_keys 0/1, created_at)
- `memberships` (workspace_id, user_id, role `owner` | `member`)
- `invites` (token_hash, workspace_id, email optional, expires_at, used_at)
**Rule: every data table carries `workspace_id` (which organisation owns the row) and `user_id` (who created it), and every query filters by `workspace_id`.** This holds even where the row already reaches its workspace through a parent (scenes through episodes, messages through threads). Each query then stands on its own, cannot leak across workspaces by a missed join, and "who made this" is always answerable.

- Added to: `channels`, `series`, `series_versions`, `series_memory`, `episodes`, `scenes`, `renders`, `episode_memory`, `episode_events`, `jobs`, `step_runs`, `ai_runs`, `outbox`, `channel_skills`, `channel_knowledge_versions`, `assistant_threads`, `assistant_messages`, `usage_events`, `budgets`, `usage_prefs`, `app_prefs`.
- `workspace_id`: NOT NULL in practice (filled by the migration for old rows, then always set on insert), indexed first in every lookup index (`(workspace_id, …)`).
- `user_id`: the signed-in person who caused the row. Rows the worker writes (jobs it spawns, step runs, AI runs, usage, outbox, events) take the `user_id` of the job that started them, i.e. the person who clicked. Nullable only for rows made by the system itself (seed data, migrations).
- `price_book`: `workspace_id` NULL means the system default the admin edits; a workspace row overrides it for that workspace.
- `usage_prefs`, `app_prefs`: keyed by `(workspace_id, key)` instead of `key`.
- `workspace_settings` (workspace_id, user_id, json): the workspace's own AI connections. The global `settings.json` stays as the admin's shared keys.
- Repositories take the workspace id as a required first argument (`list(ws, …)`, `get(ws, id)`, `insert(ws, user, …)`); there is no unscoped read. A test walks every repository with two workspaces and asserts nothing of one is visible from the other.

## Request flow

- `src/proxy.ts` (Next 16 middleware): no session cookie, so the request goes to `/login` (pages) or gets 401 (API). Public: `/login`, `/signup`, `/invite/*`, auth API, static files.
- Every route handler resolves `{ user, workspace, role }` from the session plus the current workspace (cookie `avs_ws`, checked against memberships).
- Services take a scope `{ workspaceId, userId }` and pass it to repositories; every SQL statement has `WHERE workspace_id = ?`. A row of another workspace is simply not found (404), never a 403 that reveals it exists.
- Media (`/api/v1/media/...`): signed-in only, and the file's owner channel must be in the current workspace (paths carry the episode, series or channel id; character files get a lookup).
- The worker has no user: a job carries its episode, so its channel, so its workspace. AI adapters resolve keys per job: the workspace's own key, else the shared key if the workspace may use it, else "Chưa có kết nối AI" errors.

## Screens

- `/login`, `/signup`, `/invite/[token]` (sign in or create an account, then join).
- Sidebar: workspace switcher plus account menu (sign out).
- Settings get a "Workspace" tab: name, members (remove, change role), invite link, leave or delete.
- AI connections: the workspace's own keys; shows "Đang dùng khoá chung của hệ thống" when falling back.
- System admin only: a list of workspaces with a "Cho dùng khoá chung" switch.

## Phases (each ends green: typecheck, tests, a real job through the worker)

1. Accounts: users, sessions, sign-up, login, logout, proxy guard; first user is admin and gets the existing data.
2. Workspaces: tables, memberships, scope every service and route by workspace, workspace switcher, media guard, tests for cross-workspace access (must 404).
3. Invites and members: invite links, join, member list, roles.
4. Keys and costs per workspace: workspace settings, per-job key resolution in the worker, usage and budgets scoped, admin switch for shared keys.
5. Deploy: compose with HTTPS (Caddy), `AVS_SECURE_COOKIES`, backup notes in the README.

## Not in scope now

Email sending (invite links are copied by hand), password reset by email (the admin can reset), OAuth sign-in, per-person budgets inside a workspace.
