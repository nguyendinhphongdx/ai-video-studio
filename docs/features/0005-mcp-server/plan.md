---
spec: 0005
status: approved # draft -> approved -> done
---

# Plan: MCP server for Claude Code and Codex

## Approach
There is one list of what an AI can do, used by the built-in Assistant and by MCP alike ("Tool design" below); MCP is a second way in. A route `/api/mcp` checks the code, builds the request context, and serves those tools with `@modelcontextprotocol/server` 2.4.0 (`createMcpHandler`, stateless; Apache-2.0; needs only zod). Each call runs the tool in the web request, as an approved card does today; long or paid work is already a queued job.

## Tool design
The Assistant tool becomes a class, one tool per file, in one registry.

```ts
abstract class StudioTool<Input, Output> {
  abstract readonly name: string;        // stable: stored in chat history and call records
  abstract readonly title: string;       // for people
  abstract readonly description: string; // for the model, with its quality guidance
  abstract readonly risk: 'read' | 'write' | 'paid' | 'destructive';
  readonly scope: 'workspace' | 'project' = 'project';
  readonly surfaces: Surface[] = ['assistant', 'mcp'];
  readonly minLevel?: McpLevel;          // when risk alone is not enough (approve_video)
  abstract readonly input: z.ZodType<Input>;
  abstract readonly output: z.ZodType<Output>;
  abstract summarize(input: Input, ctx): string | Promise<string>;
  protected abstract execute(input: Input, ctx): Promise<Output>; // the only logic a tool writes
  abstract present(output: Output): ToolContent;                  // what the model reads: text or image
  run(input: unknown, ctx): Promise<ToolResult<Output>>;          // shared: validate in, execute, validate out, errors
}
```

- `core/assistant/tool.ts`: the class (framework-free). `server/assistant/tools/<group>/<name>.tool.ts`: one tool each. `server/assistant/tools/registry.ts`: the single list.
- The two ways in differ only in: which project (the thread's, or a `projectId` argument), what allows a call (permission mode, or code level) and where it is recorded (chat messages, or call log).
- Tools that only MCP needs say so in `surfaces`; the built-in Assistant keeps its current set. Before adding one, check that an existing tool does not already answer it.
- No separate scope list: `risk` and `minLevel` decide.
- The conversion changes no behaviour: names, risks, input schemas and descriptions are snapshotted in a test before it starts.

## Tools (62)
"project" is `channel` in older tool names. Each project tool takes `projectId`. A level includes the ones above it.

**Chỉ đọc (21)**
- New: `get_studio_guide`, `list_projects`, `list_running_work`, `view_scene_picture`, `get_video`, `get_publish_kit`, `get_cost_summary`, `get_series_memory`
- Existing: `get_channel`, `get_knowledge`, `get_settings_status`, `list_blocks`, `list_skills`, `get_skill`, `list_series`, `get_series`, `list_characters`, `list_episodes`, `get_episode`, `list_scene_pictures`, `estimate_cost`

**Được sửa (+27)**
- New: `create_project`, `request_upload` (logo, avatar, music, scene picture), `change_episode_skill`, `use_latest_series`, `reorder_series_episodes`, `save_series_memory`, `upgrade_skill`, `reject_video`
- Existing: `update_channel`, `set_intro_design`, `set_outro_design`, `save_knowledge`, `install_market_skill`, `save_skill`, `create_series`, `update_series`, `add_series_episodes`, `save_character`, `save_character_action`, `create_episode`, `set_episode_options`, `approve_scenes`, `add_scene`, `edit_scene`, `move_scene`, `duplicate_scene`, `use_scene_picture`

**Toàn quyền (+14)**
- Costs money or runs long: `write_script`, `revise_script`, `generate_scene_assets`, `produce_video`, `generate_channel_art`, `draw_logo`, `draw_character_pictures`, `retry_work`
- The person's final say: `approve_video`
- Deletes: `delete_project`, `delete_episode`, `delete_skill`, `remove_scene`, `remove_character`

**Not offered:** `ai_fix_scene`, topic ideas, topic analysis, project setup proposal (they call a model inside the web request; only the worker may), and everything about keys, members, budgets, prices, administration and sign-in.

New tools are offered over MCP only and call the same services as the screens.

## The guide (`get_studio_guide`)
Topics, in Vietnamese: **tổng quan** (what the studio is, its features) · **khái niệm** (project, series, episode, scene, skill, block, character, knowledge) · **luồng** (first video; next episode of a series; fixing a finished video) · **điều kiện trước** (for each thing that can be made, what must exist first) · **lưu ý** (cost, long jobs and how to follow them, what cannot be undone, versioned series rules) · **hiện trạng** (what is set up, what this code may do). The server's short instructions at connection say: read the guide first. Preconditions are taken from the service code.

## Steps
Each leaves `npm run check` green and is committed on its own.

1. [ ] Contract of the 44 Assistant tools (name, risk, description, input schema) as a snapshot test — files: `tests/server/assistant-tools.test.ts` — proof: green on the code as it is.
2. [ ] `StudioTool` and one file per tool, group by group, a commit per group — files: `core/assistant/tool.ts`, `core/assistant/loop.ts`, `server/assistant/tools/**`, `docs/conventions/05-extension-points.md` — proof: the snapshot is unchanged and the Assistant tests pass.
3. [ ] Trial: SDK in a Next.js route with one fixed tool, connected from a real client on localhost — files: `app/api/mcp/route.ts`, `package.json` — proof: the client lists the tool; stop and ask if the SDK does not fit.
4. [ ] Codes and call record: tables, repository, service (create, list, revoke, authenticate; hashed; expiry; creator must still be the workspace owner) — files: `schema.ts`, `server/modules/mcp/*` — proof: tests for wrong, revoked, expired, demoted creator, other workspace.
5. [ ] The 43 existing tools over MCP: list by level, `projectId`, refused above level even by name, call record, 120 calls a minute per code — proof: tests per level and isolation; Assistant tests unchanged.
6. [ ] New data tools: projects (list, create, delete), running work, retry, episode skill and series version, video approve and reject, series order and memory, skill upgrade, publish kit, costs — proof: tests per tool, including level and isolation.
7. [ ] Files: `view_scene_picture`, `get_video` (frames and signed one-hour links), `request_upload` (one-time link, one purpose, same type and size checks as the screens) — proof: tests for expiry, reuse, tampering, wrong type, other workspace.
8. [ ] Guide and connection instructions — proof: test that every tool it names exists and is offered at the level it claims.
9. [ ] Cost marked as MCP: the context carries `via`, a queued job keeps it, the worker passes it to the ledger — proof: test.
10. [ ] Screen "Kết nối AI bên ngoài" in Cài đặt, owner only: create (name, level, expiry), code shown once, ready text for Claude Code and Codex, list with last use and calls, "Thu hồi" — proof: 1400px and 375px.
11. [ ] Connect Claude Code and Codex for real on a throw-away database, go from an empty workspace to an episode ready to produce using only the guide; update `docs/ARCHITECTURE.md`; independent review — proof: transcript of the run.

## Files touched
| Area | File | Change |
| --- | --- | --- |
| core | `assistant/tool.ts`, `assistant/loop.ts` | tool class |
| server | `assistant/tools/**` | one file per tool, one registry |
| server | `modules/mcp/*`, `context.ts`, job and usage modules, `worker/index.ts` | new module; `via` tag |
| app | `api/mcp/route.ts`, `api/v1/mcp/codes/**`, signed media and upload routes | endpoint and management routes |
| db | `schema.ts`, one migration | two tables, one column |
| ui | `features/mcp/*`, settings view | new section |
| docs | `ARCHITECTURE.md` | how outside AI connects |

`/api/mcp` does not use the cookie guard `route()`: it has its own bearer check. `proxy.ts` already lets `/api/` through.

## Data
- `mcp_codes`: id, name, code_hash (SHA-256, unique), level, expires_at, revoked_at, last_used_at, created_at, workspace_id, user_id.
- `mcp_calls`: id, code_id, tool, summary, ok, at, workspace_id, user_id. Arguments are not stored; the newest 500 per code are kept.
- `mcp_uploads`: id, token_hash, purpose, target, expires_at, used_at, workspace_id, user_id.
- `usage_events.via` (text, default '').
- One migration; isolation test for each table. Looking up a code by hash is the one query not scoped by workspace (it decides the workspace).

## Paid calls and jobs
No new kind of call or job. Existing paid tools queue the same jobs and pass the same budget check; the existing "one active job" rules stop double queueing.

## Risks
- Write access from the internet: 256-bit codes shown once, never logged, expiry, rate limit (kept in memory, so it resets on restart), revoke takes effect on the next call.
- A "Toàn quyền" code can spend money and delete without a card in the studio; the screen says so.
- A signed media link opens without signing in until it expires: anyone holding it sees that one file.
- Text in the studio (knowledge, scripts) is read by the outside AI and could try to instruct it; the level of the code is what limits the damage.
- A one-time upload link accepts one file for one purpose without signing in; it expires after 15 minutes.
- `delete_project` removes a whole project: only "Toàn quyền", and it must be given the project's exact name.
- Undo: remove the route and revoke all codes; the tables can stay.

## Proof
`npm run check`; the screens at http://localhost:3300; both clients connected to a local throw-away database (no paid calls). Connecting the clients to the public site and any paid run are asked for first.
