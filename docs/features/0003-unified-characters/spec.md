---
id: 0003
title: Unified characters, per-character library and Assistant editing
status: building # draft -> approved -> building -> delivered (or dropped)
owner: phongnd
size: large
touches: [core, server, worker, ui, remotion, tools, assistant, docs]
created: 2026-11-28
---

# Unified characters, per-character library and Assistant editing

## Problem
A person building a series sees three kinds of things ("nhân vật chính", "nhân vật phụ", "đạo cụ"), but to them everyone is a character who should have their own looks, expressions, actions and accessories. Today only the one hero has the full set (7 expressions, 14 poses, up to 12 own poses, several reference pictures). A supporting character has one picture and at most 9 faces and gestures, so it cannot walk, sit, bow or do anything of its own, an added third or fourth person can only stand, talk, wave or point, and a prop belongs to nobody. The library screen lists all of this per series in long groups, and the Assistant ("Đạo diễn") can change none of it, so every character, picture and description is handled by hand.

## Outcome
There is one kind, "Nhân vật". "Chính" is a mark that several characters may carry; it tells the AI who the story centres on and changes nothing about what a character can do. In "Thư viện dự án" the person picks a character and sees only its parts: "Mô tả", "Ảnh chuẩn", "Biểu cảm", "Hành động" (standard ones and its own) and "Phụ kiện". Props that belong to nobody sit in a shared group, "Đạo cụ chung". A picture that does not exist yet reads "Chưa vẽ" and can be drawn on the spot, with its price shown before anything is spent. In a scene, any character can do any action in any position, and picking a character offers only that character's actions, expressions and accessories. The person can also just ask the Assistant to create, change or remove characters and everything under them. Pictures and videos made before keep working at no cost.

## Scope
Delivered in three steps, each usable on its own.

- In, step 1 (one list, accessory ownership, library screen):
  - One list of characters per series, each with an id, a name, a description, reference pictures and a "Chính" mark (shown on the current hero).
  - Each accessory belongs to one character or to "Đạo cụ chung"; it can be moved between them.
  - Library screen: choose a character, then its parts; add, rename, remove; upload, replace or remove pictures; add and remove own actions; draw missing pictures. Works at widths of 900px and below, above the bottom tab bar.
  - Scene director: after choosing a character, only its expressions, actions and accessories are offered.
  - Assistant tools for everything in this step: read characters, create, edit, remove, set the mark, edit descriptions, assign accessories, add and remove own actions, request drawing missing pictures.
- In, step 2 (equal abilities):
  - Every character gets the same expressions, the same standard actions (including walk, sit, bow, think, cross arms, jump, cheer) and its own actions.
  - Every character can use any of them in any position: main place, companion, added people (in puppet and picture scenes), and in a scene's step-by-step changes.
  - The script writer, scene fixes and the Assistant know which actions, expressions and accessories each character has.
- In, step 3 (several main characters):
  - The mark can be set on several characters.
  - The old separate hero becomes an ordinary entry of the common list; nothing the person had is lost.
- Out (on purpose):
  - A character visibly holding, wearing or handing over an accessory. An attached accessory only accompanies the character or is placed beside it; truly holding it needs a pose drawn that way.
  - Sharing or copying characters between series or projects.
  - Interactions between characters (touching, carrying, fighting) beyond what exists.
  - New picture or video providers, new art styles, redrawing existing pictures automatically.
  - Brand parts ("Thương hiệu"): not decided, see open question 1.
  - The old series editor screens beyond not breaking them or the data they save.

## Acceptance
Step 1
- [ ] "Thư viện dự án" shows one list of characters per series, with no separate hero, supporting or "đạo cụ" sections other than each character's "Phụ kiện" and "Đạo cụ chung".
- [ ] A series saved before this change opens with every character, prop, picture, description and own pose it had; no paid call is made, and props without an owner are in "Đạo cụ chung".
- [ ] Choosing a character shows only its parts; every missing picture reads "Chưa vẽ".
- [ ] At 390px width, choosing a character and reaching each part needs no horizontal scrolling, and the bottom tab bar covers no control.
- [ ] A draw button shows the number of pictures and the estimated price ("chưa rõ giá" when unknown) before it runs; nothing is drawn without that action.
- [ ] Drawn pictures are recorded in the cost ledger under the right project and series, and a budget in "block" mode stops the drawing.
- [ ] Asking twice for the same missing picture while it is being drawn does not pay twice.
- [ ] In the scene director, choosing a character offers only its expressions, actions and accessories.
- [ ] The Assistant can do each of these on request, and the library screen shows the result: create a character, edit its name or description, remove it, set or clear "Chính", move an accessory, add an own action, draw missing pictures.
- [ ] In the "ask" and "auto" modes, the Assistant's drawing request waits for approval and states how many pictures and the estimated price.
- [ ] The Assistant refuses a series or character of another channel; a series of another workspace is "not found".
- [ ] The completeness counts on the library list and the setup checklist still match what is drawn.

Step 2
- [ ] A character that is not the old hero can be drawn with every standard expression and action and with own actions.
- [ ] A scene with four people can have each of them walk, sit, bow and use an own action, and the rendered video shows it.
- [ ] An action that is chosen but not drawn is marked "Chưa vẽ" in the director with a way to draw it; the scene still renders, with the character's ordinary picture.
- [ ] A newly written script never names an action, expression or accessory the chosen character does not have.
- [ ] The script check reports a scene that names something its character lacks.

Step 3
- [ ] Two or more characters can be marked "Chính", and the script writer is told which they are.
- [ ] The mark changes no available action, expression or accessory.
- [ ] A series with an old hero shows it as an ordinary character marked "Chính", with all its pictures and references.

All steps
- [ ] An episode written before the change previews and renders with the same characters, positions and gestures as before, with no paid call.
- [ ] Exporting and importing a series keeps characters, marks and accessory ownership; a file exported before the change still imports.
- [ ] Tests cover: reading old series data, accessory ownership, workspace and channel scoping of the new tools, queueing the same drawing twice, and which actions a character offers in each position. No test spends money.
- [ ] `npm run check` is green and one real episode has been produced through the worker.

## Constraints
- **Versioned series rules (rule 5).** Characters live in a series' rules, not in the project. Every saved change creates a new series version; no stored version is edited. Episodes keep their pinned version, so they see new pictures or accessories only after moving to the latest one (the existing "use latest series" action) or being rewritten. Old versions must stay readable as they are.
- **Project screen, series data.** The library screen covers a project (channel) with several series, each with its own characters (open question 2).
- **Existing data.** Today: reference pictures and one description text for the series, hero pictures, supporting characters and props sharing one map, a planned library of at most 20 entries that distinguishes hero, character and item, and own poses for the hero only. Characters added by hand have only an id (no name or description), and the single description text is not split per character. The plan must say what each old entry becomes without calling a model.
- **Paid calls (rules 7 and 3).** Costs money: drawing any character, expression, action or accessory picture (one picture call each), and the Assistant's own model calls. Giving every character the full set raises a supporting character from at most 9 extra pictures to about 20 plus its own actions, so nothing is drawn automatically. Drawing goes through the existing picture adapter, ledger and budgets. The existing sprite job does not carry the project or series, which the attribution line above requires.
- **Assistant (rule 3).** All new AI abilities are assistant tools with a declared risk (read, write, paid, destructive for removal). The library screen gets no AI text inputs. Anything the AI writes here (descriptions, action descriptions) needs its harness.
- **Worker (rule 4).** Drawing runs as a job. A drawing asked for in chat must end up saved in the series without the person having the library screen open, and must not overwrite edits made while it ran.
- **Workspace and channel scoping (rules 9 and 10).** Every read and write is scoped; tools refuse ids of other channels. Uploaded and drawn pictures stay protected by the existing media access rule.
- **Media (rule 12).** Existing files are reused, not copied or redrawn.
- **Rendering.** A change in how figures are drawn means cached clips are redrawn on the next production (machine time, no money). Preview and render must agree.
- **Prompt size.** The series instructions sent to the AI are capped; listing every character's abilities must fit without silently cutting off characters.
- **UI.** Vietnamese text, v2 CSS only, usable at 900px and below.
- **Library redesign.** Step 1 builds on the library screens as redesigned in commit `a6c7273`.
- **Where it lives today (for the planner).** `src/core/domain/series.ts`, `src/core/character/`, `src/core/domain/tune.ts`, `src/core/context/providers/instructions.ts`, `src/core/quality/checks`, `src/core/pipeline/steps/render.ts`, `remotion/blocks/{puppet,figures}.tsx`, `remotion/puppet/rig.ts`, `src/tools/remotion/blocks/puppet.ts`, `src/server/modules/{series,setup,episode}`, `src/server/assistant/tools`, the sprite and library worker jobs, the library views and `src/features/v2/views/director/`.

## Open questions
All answered: on 2026-11-28 the owner approved the spec with every recommendation below as the decision.

1. **Brand section.** Should the Assistant also be able to add, replace and remove the logo, presenter picture ("Người dẫn") and music, and remove intro/outro art? Today it edits colours, font, texts, picture style and intro/outro designs and generates art, and the chat takes no file attachments. Recommended: out of this feature, in its own spec, because uploading from chat needs attachments, which is a separate piece of work.
2. **Series or project.** Do characters stay owned by a series? Recommended: yes. The library screen asks for the series first (skipped when there is only one), then the character; no sharing between series.
3. **When do changes take effect?** Recommended: manual edits keep "Lưu nhân vật"; each Assistant change is saved at once as a new series version and says so; existing episodes are never moved automatically, and the Assistant offers to move the episode the person is looking at.
4. **Paid drawing in "bypass" mode.** Today this mode never asks, also for paid actions. Should character drawing be an exception? Recommended: no, keep one rule for all paid tools; the price is still reported in the reply and recorded.
5. **Several main characters.** When a scene names nobody for the main place, who stands there, and whose reference pictures guide painted scenes (today the hero's, at most 4)? Recommended: the first character marked "Chính" in list order (the old hero after migration); references come from the marked characters, one each in list order, still at most 4.
6. **Shared props in the director.** When a character is chosen, are "Đạo cụ chung" offered besides its own accessories? Recommended: yes, as a separate group. Accessories never appear in a scene unless the script or the person puts them there.
7. **Removing a character that episodes use.** Recommended: allow it after a confirmation that names the episodes; those keep their pinned version and still render, and moving them to the latest version reports the scenes that lost someone.
