---
id: 0004
title: Assistant chat on AI Elements with AG-UI streaming, thinking and attachments
status: building # draft -> approved -> building -> delivered (or dropped)
owner: phongnd
size: large
touches: [core, server, worker, ui, assistant, db, docs]
created: 2026-11-28
---

# Assistant chat on AI Elements with AG-UI streaming, thinking and attachments

## Problem
A person working with the Assistant ("Trợ lý") sends a request and sees only "Trợ lý đang làm…" until whole messages appear; the screen asks the server again about every second. They cannot see what the AI is thinking, cannot stop it, and cannot show it anything: no file upload, no pasting a screenshot. The chat parts are hand-made, so tool results are raw text and every new ability is built from nothing.

## Outcome
The chat uses AI Elements (the chat components now shipped by shadcn/ui, copied into the repo). Answers and thinking appear as they are produced, each tool step shows its input, state and result, and a paid or destructive step asks "Đồng ý" / "Từ chối". The person can attach files, paste a picture with Ctrl+V or drop one on the chat, and press "Dừng". Reloading loses nothing: the work goes on in the background.

## Scope
Delivered in two steps, each usable on its own.

- In, step 1 (components and attachments):
  - Thread, scroller, messages, tool cards, approval card and composer from AI Elements. Where it has a ready part for something the chat needs, use it instead of writing our own.
  - Composer: attach button and menu, attachment chips with upload state and remove, Ctrl+V paste, drag and drop, send, suggestions. Paste and drop are added by us if the component lacks them.
  - The Assistant sees attached pictures and text files. A provider or model that cannot read pictures says so clearly.
  - Kept as today: permission modes, conversation list and new conversation, suggestions by page, current page sent with the message, "AI làm" requests, waiting dot, "Chưa cài AI" notice, full screen on phones with safe areas.
  - Copy on answers.
- In, step 2 (AG-UI):
  - The server sends AG-UI events; answer text, thinking and tool calls appear live.
  - Thinking is shown in a collapsible block for providers that return it.
  - Approval is an AG-UI interrupt.
  - "Dừng" stops the running turn.
  - After a reload or dropped connection the screen catches up. Works through the Cloudflare Tunnel.
- Out (on purpose):
  - New things the Assistant can do beyond reading attachments (tools and permission rules unchanged). Using an attached picture as a logo or character picture is a later feature.
  - Any hosted service (Vercel AI Gateway, CopilotKit, Assistant Cloud) and running the model inside a web request.
  - Audio or video attachments, editing or branching earlier messages.

## Acceptance
Step 1
- [ ] Every "kept" item works on desktop and at 375px.
- [ ] Old conversations show their messages, tool cards and statuses.
- [ ] A pasted screenshot, a dropped picture and a chosen file each appear as a chip, can be removed, and reach the AI.
- [ ] A file that is too large or of a wrong type is refused with a Vietnamese reason.
- [ ] Attachments of one workspace cannot be read by another (test); deleting a conversation deletes them.
- [ ] "Đồng ý" runs the action once; "Từ chối" runs nothing.
- [ ] No other screen changes appearance.

Step 2
- [ ] With each configured provider that can stream, text appears before the answer is complete; one that cannot still answers whole.
- [ ] Thinking appears when the provider returns it; no empty block otherwise.
- [ ] A tool step shows as running before it finishes.
- [ ] "Dừng" ends the turn, keeps what was written and starts no further tool.
- [ ] Reloading mid-turn duplicates and loses nothing; closing the browser does not stop the turn.
- [ ] Every model call is recorded with its cost, including failed or stopped ones.
- [ ] Another workspace cannot read a conversation's stream (test).

## Constraints
- AI is called only from the worker through the cost-recording adapters; the budget check stays.
- Uploads, history and streams are scoped by workspace. Schema changes come with a migration.
- Paid and destructive actions never run without the person's yes, except in the mode they chose.
- Cost: pictures add input tokens, and thinking adds output tokens. No other new paid calls. Testing with a real model is asked for first.
- AI Elements is copied code, not a package; its examples are shaped around the Vercel AI SDK. We map our own data and AG-UI events to its parts. Whether the copied files need the `ai` package, and the licence, are checked before step 1.
- The old elements.ai-sdk.dev project is announced as deprecated at the end of November 2026; install from ui.shadcn.com.
- Step 2 starts with a small trial of AG-UI events driving these components.

## Open questions
None. Decided by the owner on 2026-11-28 ("Duyệt theo đề xuất"):
- Attachments: PNG, JPG, WEBP, TXT, MD; 8MB each, 5 per message. PDF later. (While building: text files are limited to 200KB, because their whole text goes into the prompt.)
- Thinking is on, with the model's current effort setting; its block is collapsed.
- No voice input and no model picker in the composer.
- Stop after step 1 for the owner to try it.
