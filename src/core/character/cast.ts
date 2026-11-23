// What the cast generator asks the picture model for: one transparent sprite of a supporting character or a prop,
// drawn in the series' style (the main character's reference picture is sent along only to fix the style).
import { CHROMA_HEX } from './expressions';

export type CastKind = 'character' | 'item';

/** The prompt for one cast sprite. `description` says what to draw; the reference picture only sets the drawing style. */
export function castPrompt(description: string, kind: CastKind): string {
  const subject = kind === 'character' ? 'Show the full body of this character, standing, facing the viewer, feet fully visible' : 'Show this single object, complete and centred, large in the frame';
  return [
    `Draw ${description.trim().replace(/\.$/, '')} in exactly the same art style as the reference picture (thick clean dark outlines, flat cel-shaded colours, chibi proportions). Do NOT copy the reference character itself: it only shows the style.`,
    `${subject}, nothing else in the picture.`,
    `Paint it on a perfectly flat, solid pure green (${CHROMA_HEX}) background that fills the whole frame: no ground, no shadow, no gradient, no text.`,
    'Do not use green anywhere on the subject.',
  ].join(' ');
}
