---
name: add-block
description: Add a scene type (block) to a render tool. Use when videos need a new kind of scene.
---

# Add a block

Rules: `docs/conventions/05-extension-points.md`. Copy `src/tools/remotion/blocks/counter.ts` and its component in `remotion/blocks`.

- [ ] Component in `remotion/blocks/<name>.tsx`, exported from the barrel the other blocks use. Everything is a pure function of the frame number (seeded noise): renders must repeat.
- [ ] `src/tools/remotion/blocks/<name>.ts` with `defineBlock({ id, name, summary, aiGuide, props, fields, defaults, minSeconds, sfx?, normalize? })`. Prop `.describe()` texts are Vietnamese and tell the AI limits (lengths, no invented facts).
- [ ] Keep the compile-time check `Assert<Same<z.infer<typeof props>, XSceneProps>>` so schema and component cannot drift.
- [ ] `aiGuide` says when to use it and when not, and a cap per video.
- [ ] Register it in the tool's `tool.ts`; startup validation fails on duplicates and missing renderers.
- [ ] Changes to how a render looks: bump `RENDER_VERSION`.
- [ ] `tests/tools/catalog.test.ts` still passes; add a test for `normalize` and `sfx` if non-trivial.
- [ ] Look at it in `npm run studio` and in the template library `/templates`.
- [ ] `npm run check`.
