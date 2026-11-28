---
id: 0005
title: MCP server so Claude Code and Codex can work in the studio
status: building # draft -> approved -> building -> delivered (or dropped)
owner: phongnd
size: large
touches: [core, server, ui, assistant, db, docs]
created: 2026-11-28
---

# MCP server so Claude Code and Codex can work in the studio

## Problem
A person who already works with Claude Code or Codex cannot ask it to do studio work. The only ways in are the screens and the built-in Assistant, which uses the model and API key set in the studio. An outside AI today can only change the code or the database, which skips every check and permission.

## Outcome
In "Cài đặt", the person creates a "Mã kết nối", picks what it may do, and copies a ready command for Claude Code or Codex. That AI can then list their projects, read and edit them, make videos and follow progress, through the same actions the Assistant has and the same checks as the screens. The person sees when each code was last used and what it did, and can "Thu hồi" it at once.

## Scope
- In:
  - An MCP address on the same site (Streamable HTTP over HTTPS), authenticated with a bearer code.
  - The Assistant's tools, offered over MCP. The project is chosen per call (the outside AI has no "current page").
  - Added for outside use: list projects; see the state of running work. (`get_episode` already reports its job.)
  - A guide to the studio (added 2026-11-28 at the owner's request): what it is, its features and words, the usual flows, what must exist before what, what costs money or cannot be undone, plus what is set up now and what this code may do. A short version is sent when a client connects.
  - Everything else a person does for making videos (added 2026-11-28 at the owner's request, "bổ sung đầy đủ"): create and delete a project; send a picture or music file through a one-time upload link; change an episode's skill or take the series' latest version; reorder a series and edit its memory; upgrade a skill; approve or reject a finished video; retry failed work; read the publish kit and costs. The full list is in the plan.
  - Seeing results (added 2026-11-28 at the owner's request): a scene's picture returned for the AI to look at, and a finished video as frames plus a signed link that expires after about an hour.
  - Codes belong to one workspace and one person; shown once, stored hashed, revocable, with last-used time.
  - Levels: "Chỉ đọc" (read), "Được sửa" (read, write), "Toàn quyền" (also paid and destructive). Default "Được sửa". A tool above the level is not listed and is refused if called.
  - A record of calls per code (tool, one-line summary, result, time).
  - Setup text on screen for Claude Code and Codex.
- Out (on purpose):
  - ChatGPT and claude.ai connectors. ChatGPT documents OAuth or no authentication, not a pasted code; this needs its own OAuth feature later. claude.ai was not checked.
  - Account and money controls: AI keys and settings, members and invitations, budgets, the price book, system administration, sign-in.
  - Actions that call a model while the person waits (scene fix, topic ideas, topic analysis, project setup proposal): the outside AI is the model and writes the result with the editing tools.
  - Publishing to a video platform (the studio has a publish kit, not an uploader).
  - Approval cards inside the studio for outside calls: the level of the code is the studio's limit, and the client app asks the person on its side.
  - Giving the built-in Assistant the new tools.

## Acceptance
- [ ] Claude Code and Codex each connect with the shown instructions and list the tools.
- [ ] With a "Chỉ đọc" code nothing can be changed; with "Được sửa" no paid or destructive tool runs, even when called by name.
- [ ] A code of one workspace cannot see or change another's data (test).
- [ ] No code, a wrong code and a revoked code are refused, with nothing run.
- [ ] A member who leaves the workspace can no longer use their codes.
- [ ] Paid work started over MCP is recorded with its cost, marked as from MCP, and stopped by the budget like any other.
- [ ] Long work returns at once with something to check progress with.
- [ ] Every call appears in the code's record.
- [ ] An AI that reads only the guide can name the steps and prerequisites to get from nothing to a finished video; a test fails when the guide names a tool that does not exist.
- [ ] The AI can look at a scene picture; a video link opens without signing in, opens only that file, and stops working after it expires.
- [ ] The built-in Assistant behaves as before.

## Constraints
- Tools keep calling the same services; every query stays scoped by workspace; the request context carries user and workspace, never passed as parameters.
- AI is called only from the worker through the cost-recording adapters. Any tool that calls a model while it runs must queue a job when used over MCP.
- New tables (codes, call record) come with a migration and isolation tests.
- This opens write access to the public site from outside: codes must be long random values, never logged, and calls rate limited.
- Cost: the outside AI's own thinking is billed to the person's Claude or Codex plan. Pictures, voices and studio script writing are still billed to the studio's keys.
- New dependency: an official MCP SDK (`@modelcontextprotocol/server` 2.4.0, Apache-2.0, or `@modelcontextprotocol/sdk` 1.32.2, MIT; the plan picks one after checking it runs in a Next.js route).
- Client support, read 2026-11-28: Claude Code takes `claude mcp add --transport http <name> <url> --header "Authorization: Bearer <code>"`; Codex takes `url` and `bearer_token_env_var` under `[mcp_servers.<name>]`. Confirm both by connecting for real before delivery.

## Open questions
None. Decided by the owner on 2026-11-28 ("Duyệt theo đề xuất"):
- A code reaches every project of its workspace.
- "Toàn quyền" exists from the start, is never the default, and warns that it can spend money and delete.
- Only the workspace owner creates codes.
- Codes expire after 90 days by default; "không hết hạn" can be chosen.
