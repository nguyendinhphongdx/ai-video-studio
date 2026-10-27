# Architecture

## Model

| Concept | What it is | Lives in |
| --- | --- | --- |
| Channel | Brand kit: audience, tone, voice, palette, logo, avatar, music, image style, and its own AI-designed intro and outro (`SceneDesign` JSON, optional AI background art) | SQLite `channels` |
| Tool | A rendering engine a skill can name: `@remotion`, `@hyperframes` | `src/tools/<tool>/tool.ts` |
| Block | A scene type of a tool with a props schema: `@remotion/cards` | `src/tools/<tool>/blocks/*.ts` |
| Skill | Playbook for one kind of video; references tools/blocks. Belongs to a channel (SQLite `channel_skills`), installed from the market (`market/skills/<id>/SKILL.md`) or written by a person or the AI | SQLite `channel_skills` |
| Series | The agent for a show: bible + format + publish template, versioned | SQLite `series`, `series_versions` |
| Episode | One video, in a series (numbered) or one-off | SQLite `episodes`, `scenes` |
| Knowledge | The channel's own facts, rules and sources; versioned, read by every AI call of the channel | SQLite `channel_knowledge_versions` |
| Memory | What each approved episode covered, read by later episodes | SQLite `episode_memory`, `series_memory` |

A one-off video uses a format derived from its skill (one AI slot), so every video goes through the same path.

## The series agent

Every AI call compiles the same layered context (`src/core/context`), in this order, each with a size budget:

1. system rules · 2. channel · 3. series instructions (bible) · 4. skill · 5. style + allowed blocks ·
6. episode format (slots) · 7. memory (season summary + recent episodes) · 8. current episode

`runTask` (`src/core/agent/runner.ts`) compiles the layers a task asks for, calls the model, validates the
output against the task's schema and stores an `ai_runs` row with the exact context, so results can be explained
and reproduced.

The output schema of a script is generated from the episode's active **ai** slots and their allowed blocks.
**Locked** slots never reach the AI: they are filled from the format's templates (`{n}`, `{topic}`, `{next_topic}`...).

## Extension points

| Need | Extension point | Add | Contract |
| --- | --- | --- | --- |
| New scene type / engine | Tool → Block | `src/tools/<tool>/blocks/<block>.ts` (+ component, renderer) | `core/tools/tool.ts` |
| New kind of context | Context provider | `src/core/context/providers/<x>.ts`, list in `providers/index.ts` | `core/context/layer.ts` |
| New AI job | Agent task | `src/core/tasks/<x>.ts` | `core/agent/task.ts` |
| New production step | Pipeline step | `src/core/pipeline/steps/<x>.ts`, list in `steps/index.ts` | `core/pipeline/step.ts` |
| React to something | Domain event subscriber | `src/server/subscribers.ts` | `core/events/events.ts` |
| New quality rule | Quality check | `src/core/quality/checks/` | `core/quality/check.ts` |
| New provider (AI, TTS, storage, upload) | Assistant tool | Something the one assistant chat can do | `src/server/assistant/tools/<x>.ts`, list in `tools/index.ts` | `core/assistant/tool.ts` |
| Port + adapter | `src/server/adapters/<x>` | `core/ports.ts` |

Registries are validated at startup (`core/registry.ts`): duplicate ids, tools without renderers and step cycles fail at boot.

## Runtime

- **Web** (Next.js): UI + route handlers. Services enqueue jobs and append events; they never render.
- **Worker**: claims jobs from `jobs` one at a time (`write_script`, `revise_script`, `produce`, `summarize`) and delivers `outbox` events to subscribers. Jobs left running by a crashed worker are failed on start, with a retry button in the UI.
- **Scenes first, production last.** In the scenes step the person works scene by scene: edit, generate the picture (blocks that declare an `image` slot, such as `@remotion/vox` and `@remotion/picture`) and the voice, listen, and approve. Those are `scene_assets` worker jobs, the only place paid image/voice providers are called, and only on request (or automatically after a script when the video's `autoImages`/`autoVoice` are on). A scene stores its files with the hash of the prompt/text they were made for, so a later edit marks them stale and withdraws the approval; a rewritten script keeps finished work for scenes that did not change (`carryOver`). The script can only be approved for production when every scene is approved.
- **Production** is a step graph (images ∥ voice → render → assemble → thumbnail → quality). The `images` and `voice` steps only collect the approved files of each scene (they fail with the scene number if one is missing or stale); rendering and assembling join them. Step outputs are cached in `step_runs` by input hash, so a retry resumes from the failed step.
- **Storage**: SQLite (`node:sqlite`, WAL) in `data/app.db`; generated media in `data/media`; settings (API keys) in `data/settings.json`. All gitignored.

## Channel-owned intro and outro

There are no shared intro/outro looks. Each channel holds an `introDesign` and an `outroDesign` (`src/core/domain/design.ts`): a background plus layers (text, shapes, logo, avatar, AI art, subscribe button) with percent positions for 16:9 and 9:16, colours and entrance animations. The AI designs them (`design-brand-kit` task, worker job `suggest_brand`) and edits them from feedback; `@remotion/title` and `@remotion/outro` draw whatever design the channel has through one generic component (`remotion/design.tsx`). A channel without a design gets a plain fallback until the AI designs one. AI background art is a separate worker job (`generate_art`) that saves a picture on the channel.

## Channel-owned skills and knowledge

Skills and knowledge belong to a channel; nothing about a kind of channel is built in. The market (`market/skills`) is only a catalogue: installing copies a skill into the channel, after which the channel edits it freely and other channels are unaffected. The AI can draft a skill or the knowledge from the channel's own context (jobs `author_skill`, `draft_knowledge`); drafts are shown in the editor and saved only by the person. Knowledge is saved as immutable versions and enters every prompt as the `knowledge` context layer; an episode records the version it was written with (`episodes.knowledge_version`) and offers a rewrite when the channel's knowledge moved on. Skills used before this change (shared files) are copied into the channel the first time it is read.

## The assistant (one AI chat)

There is exactly one conversational AI. It sits in a panel on every page, knows where the person is (channel, video, scene) and does things through tools (`src/server/assistant/tools`): design the channel's intro/outro, edit brand fields, write knowledge and skills, install market skills, plan series, create videos, write and revise scripts, edit single scenes, generate pictures and voices, approve scenes, produce. Screens keep direct controls (forms, scene cards, save and approve buttons) but have no AI inputs of their own.

- **Loop** (`src/core/assistant/loop.ts`): model call, tool calls, results, repeat. Every step is stored (`assistant_messages`), so a turn can stop for approval and continue. It runs as a worker job (`assistant_turn`); the UI polls the thread.
- **Permission modes** per conversation: *ask* (confirm every change), *auto* (confirm only paid and destructive tools), *bypass* (never confirm). Tools declare a risk: read, write, paid, destructive. A call waiting for approval is a `tool` message with status `awaiting`; approving runs it and starts the turn again, saying something else drops it.
- **Scope**: a conversation belongs to one channel; tools refuse ids of other channels. Long work (scripts, pictures, voices, production) stays in the existing worker jobs; the tools only enqueue it.
- **Quality guidance** for what the assistant writes (design, knowledge, skills, series) is attached to the tool that saves it (`src/core/assistant/guides.ts`).
- A provider needs tool calling (`LlmPort.chat`): Claude, OpenAI, Gemini work; small local models usually do not.

## Cost tracking

Every paid call (LLM, picture, Google voice) is a row in `usage_events`, an append-only ledger with no foreign keys (deleting a video keeps what it cost). Adapters write it, not the core: `llm.service`, `image.service` and `tts.service` read the provider's usage (tokens, pictures, audio seconds; estimated and flagged when the provider reports none) and call `usageService.record`, which prices it from the `price_book` at that moment and stores the USD cost, so editing prices later never rewrites history. Who the call belongs to (channel, series, video, job, thread) comes from an `AsyncLocalStorage` scope opened by the worker, the assistant turn and API routes (`usage.scope.ts`); the core only passes a `purpose` (task id) and a `sceneId` through the ports. `budgets` are daily or monthly limits per system or channel; `usageService.assertWithinBudget()` runs before each paid call and stops it when a "block" budget is used up. The Cost screen (`/usage`) reads summaries from `usage.service`; `POST /usage/estimate` prices a batch before it is run (shown on the storyboard buttons). The default price book is a reference that goes stale; model ids with no matching row are counted as "no price" rather than guessed.

## Writing a script

`writeScript` is three `runTask` steps: `plan-story` (question, answer, stakes, a recurring thread and one beat per scene, each leaving a question for the next), `write-episode` (writes the scenes to that plan), and `smooth-narration` (reads all narration as one voice-over and rewrites only the narration so the cuts between scenes disappear). The smoothing step is optional: if it fails or returns the wrong number of lines the written script stands and the episode log says so. `reviseScript` stays a single call.

## Camera, depth, sound and checks on the finished video

Ideas here are adapted from video-shotcraft (Apache-2.0); see NOTICE for what was taken.

- **Camera and depth** (`remotion/camera/`): `moves.ts` has eighteen camera moves (push, pan, drift, orbit, tilt-glide, overhead, crash-zoom, slide-parallax, bullet-time, pull-back, drone-dive, graze-slide, steep-slide, handheld-push) as pure poses of the scene's progress; `DepthStage.tsx` puts a picture on a perspective stage with a blurred far plane and dust as the near plane (`depth: layered`), or just tilts the full-bleed picture (`depth: flat`). `vox` and `picture` use it; `auto` picks both from the scene's position so neighbours differ. Everything is a pure function of the frame number (seeded noise), so renders repeat.
- **Scene entrances** (`entranceFor` / `SceneFade` in `remotion/shots/transitions.tsx`): 17 ways a scene opens (fade, flash, whip, wipe, iris, push-up, barn-door, blinds, glitch, ink, light-leak, flip, mosaic, checker, radial-wipe, diagonal-wipe, zoom-through), chosen from block and order so neighbours differ. Scenes render as separate clips, so these are the incoming scene's own opening, not a blend with the previous one.
- **Text shots** (`remotion/shots/text/`): 27 typography shots, a `look` of the `kinetic` block. `meta.ts` (pure data) lists them; `entrances.tsx` and `cycles.tsx` draw them. Previews are in `docs/shot-previews/`.
- **Light effects** (`remotion/shots/fx-meta.ts`, `fx.tsx`): nine overlays a picture scene can carry (`fx` prop: sheen, spotlight, scan, reticle, light-leak, ripple, burst, aurora, glow-orbs); `auto` leaves most scenes clean.
- **Rhythm cuts** (`remotion/camera/cuts.tsx`, `rhythm` prop of picture scenes): jump-punch, flash-freeze, comic-panels, quad and sakuga, all crops of the one picture; `auto` almost always means none.
- **Intro/outro vocabulary** (`src/core/domain/design.ts`, `remotion/design.tsx`): beyond text, shapes, logo, avatar, art and the subscribe button, a design can use entrances `materialize`, `stamp`, `glitch`, `blur-in`, `drop`, `spin-in`, `crash-in`, shapes `glow`, `rays`, `grid`, and a `marquee` layer (running big text). The assistant's design guide says when each fits a channel.
- **More blocks:** `kinetic` (words moving in), `counter` (rolling number), `chart` (bars from "Name: number" lines), `timeline` (camera travels along dated milestones), `gauge` (needle sweep and readout), `dots` (share lit in a crowd of dots). They need no AI picture.
- **Sound effects** (`src/core/audio/sfx.ts`): a block can declare `sfx(scene)` cues (a thud on a stamp, ticks on typed text); `planCues` adds a sweep into each cut, spaces cues, and keeps them under the voice. The assemble step mixes them into the final file in the same ffmpeg call as the music. Sounds are synthesised with ffmpeg on first use (`src/server/adapters/sfx/`), and files a person drops into `data/sfx/<kind>/` win. On/off and level are in Settings (`app_prefs`).
- **Checks on the finished file:** `VideoPort.analyze` runs ffmpeg blackdetect, silencedetect and volumedetect; the `av-health` check turns black holes, long silences, clipping and a too-quiet mix into warnings in the video stage. Design text has a minimum size, and a full-frame panel over AI art is kept to a veil.

### Software-window scenes

`remotion/ui` plays a scene inside an app window (traffic-light bar, generic cards and rows) in ten looks listed in `remotion/shots/ui/meta.ts` and drawn in `looks.tsx`: cards flying in, row cascade, stack fan, cursor select, chip filter, toggle, search typing, notification stack, tab switch, progress. The content slots are generic (`title`, `items` one per line, `target` the item a cursor clicks), so any product fits. Looks with a cursor click at `CLICK_FRAME`, which the block's sound cues use for a tick. `auto` rotates through the looks by ordinal (`uiLookFor`). The default skill lists it, with an AI guide that limits it to software topics.

## The template library

`/templates` (reached from the channel's advanced section and the scene editor, not the main menu) lists every text shot, entrance, camera move, light effect, rhythm cut and scene type, each running live on the channel's colours. `src/features/templates/lib/catalog.ts` builds the list from the same meta files the editor reads, so a new shot appears there without extra work; previews only mount while on screen and use a built-in sample picture (no AI call).

## Make it all

"Làm hết giúp tôi" on the storyboard confirms once what will be made (pictures and voices still missing), the estimated cost against the budgets, and whether to approve afterwards; it queues the usual `scene_assets` job for all scenes. `src/core/scenes/make-plan.ts` computes the plan and the budget warnings for both the screen and the assistant's read-only `estimate_cost` tool. "Duyệt nhanh" plays the whole video with real pictures and voices and approves everything ready in one call.
