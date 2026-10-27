// Deterministic helpers: every frame is a pure function of its number (no Math.random / Date.now), so renders repeat.
// Adapted from video-shotcraft (Apache-2.0), see NOTICE.

/** Seeded PRNG: the same seed always gives the same sequence. */
export const mulberry32 = (seed: number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Hand-held camera drift: layered sines at unrelated frequencies read as organic, amplitude in the caller's unit. */
export const handheld = (frame: number, amp = 1): { x: number; y: number } => ({
  x: amp * (Math.sin(frame * 0.31) + 0.6 * Math.sin(frame * 0.83 + 1.7)),
  y: amp * (Math.sin(frame * 0.47 + 0.9) + 0.5 * Math.sin(frame * 1.13 + 3.1)),
});
