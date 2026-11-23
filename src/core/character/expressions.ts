// What the sprite generator asks the picture model for: one prompt per expression of the puppet character.
// Pure text, no I/O, so the wording is testable and the server only decides where files go.
// Keep the list in step with EXPRESSIONS in remotion/puppet/rig.ts (a test checks it).
export const EXPRESSIONS = ['neutral', 'talk', 'blink', 'happy', 'angry', 'sad', 'surprised'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Background colour the model paints behind the character; the server keys it out afterwards. */
export const CHROMA_KEY = { r: 0, g: 255, b: 0 } as const;
export const CHROMA_HEX = '#00FF00';

const LOOK: Record<Expression, string> = {
  neutral: 'a calm neutral expression: eyes open, mouth gently closed',
  talk: 'the same pose, mouth open as if speaking, eyes open',
  blink: 'the same pose, both eyes closed in a blink, mouth gently closed',
  happy: 'a joyful smile with bright cheerful eyes',
  angry: 'an angry expression: frowning brows, tight mouth',
  sad: 'a sad expression: drooping brows, small downturned mouth',
  surprised: 'a surprised expression: wide eyes, small open mouth',
};

/** The prompt for one expression. Reference pictures (the series' character, then the neutral sprite) are sent next to it. */
export function expressionPrompt(expression: Expression): string {
  return [
    'Redraw the exact same character shown in the reference picture(s): same face shape, colours, outfit, proportions and art style.',
    `Show the full body, standing, facing the viewer, centred, with the feet fully visible, with ${LOOK[expression]}.`,
    `Paint it on a perfectly flat, solid pure green (${CHROMA_HEX}) background that fills the whole frame: no ground, no shadow, no gradient, no props, no other characters, no text.`,
    'Do not use green anywhere on the character.',
  ].join(' ');
}

/** Expressions that still need a picture, neutral first (the others are drawn from it too). */
export function missingExpressions(have: Record<string, string>, wanted: readonly Expression[] = EXPRESSIONS): Expression[] {
  const todo = wanted.filter((e) => !have[e]);
  return todo.includes('neutral') ? ['neutral', ...todo.filter((e) => e !== 'neutral')] : todo;
}
