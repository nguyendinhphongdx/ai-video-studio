// What the sprite generator asks the picture model for: one prompt per expression of the puppet character.
// Pure text, no I/O, so the wording is testable and the server only decides where files go.
// Keep the lists in step with EXPRESSIONS and POSES in remotion/puppet/rig.ts (a test checks it).
export const EXPRESSIONS = ['neutral', 'talk', 'blink', 'happy', 'angry', 'sad', 'surprised'] as const;
export type Expression = (typeof EXPRESSIONS)[number];
/** Body poses: walk cycle frames (drawn walking towards the right; the rig mirrors them), wave frames, held poses and jump frames. */
export const POSES = ['walk1', 'walk2', 'walk3', 'walk4', 'wave1', 'wave2', 'point', 'think', 'cross', 'bow', 'sit', 'crouch', 'leap', 'cheer'] as const;
export type Pose = (typeof POSES)[number];
/** Every sprite a puppet character can have. */
export const SPRITES = [...EXPRESSIONS, ...POSES] as const;
export type SpriteKey = Expression | Pose;

/** Short ids of a series' own poses and supporting cast (lower case, digits, dashes). */
export const POSE_ID = /^[a-z0-9][a-z0-9-]{0,23}$/;
/** A series may add its own poses for the hero; their sprites sit in characterSprites under `pose:<id>`. */
export const MAX_CUSTOM_POSES = 12;
export const customPoseKey = (id: string) => `pose:${id}`;
/** Any key characterSprites may hold. */
export const SPRITE_KEY = new RegExp(`^(${SPRITES.join('|')}|pose:[a-z0-9][a-z0-9-]{0,23})$`);

/** The few poses a supporting character can have; their sprites sit in characterCast under `<id>:<pose>`. */
export const CAST_POSES = ['talk', 'wave1', 'wave2', 'point'] as const;
export type CastPose = (typeof CAST_POSES)[number];
export const castPoseKey = (castId: string, pose: CastPose) => `${castId}:${pose}`;
/** Any key characterCast may hold: a cast id, or a cast id and one of its poses. */
export const CAST_KEY = new RegExp(`^[a-z0-9][a-z0-9-]{0,23}(:(${CAST_POSES.join('|')}))?$`);

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

const WALK = 'walking towards the right side of the frame, body turned three-quarters to the right, a natural step';
const POSE_LOOK: Record<Pose, string> = {
  walk1: `${WALK}: right foot forward with the heel touching the ground, left arm swinging forward, right arm back`,
  walk2: `${WALK}: legs passing under the body, left knee lifted slightly, arms close to the sides`,
  walk3: `${WALK}: left foot forward with the heel touching the ground, right arm swinging forward, left arm back`,
  walk4: `${WALK}: legs passing under the body, right knee lifted slightly, arms close to the sides`,
  wave1: 'facing the viewer and smiling, one hand raised high beside the head with the palm open, waving, the hand tilted outward',
  wave2: 'facing the viewer and smiling, one hand raised high beside the head with the palm open, waving, the hand tilted inward towards the head',
  point: 'facing the viewer, one arm stretched straight out to the side with the index finger pointing at something off to the side',
  think: 'facing the viewer, one hand touching the chin, eyes looking up, thinking hard',
  cross: 'facing the viewer, arms crossed firmly over the chest, confident',
  bow: 'bowing politely to the viewer, upper body bent forward from the waist, hands together in front',
  sit: 'sitting cross-legged on the (invisible) ground, facing the viewer, hands resting on the knees',
  crouch: 'crouching low with bent knees and arms swung back, about to jump',
  leap: 'in mid-air jumping with joy, knees tucked up, both arms raised, feet off the ground',
  cheer: 'standing, both fists raised high above the head in celebration, big happy smile',
};

/** How tall the character stands in each pose, relative to its neutral sprite (the picture model draws every one at a different scale). */
const HEIGHT: Partial<Record<Pose, number>> = { wave1: 1.06, wave2: 1.06, bow: 0.86, sit: 0.68, crouch: 0.76, leap: 0.95, cheer: 1.12 };
/** Height ratio for any sprite key; expressions, walk frames and the series' own poses stand as tall as neutral. */
export const heightRatio = (key: string): number => HEIGHT[key as Pose] ?? 1;

/** Pose sprites get a canvas wider than tall (arms and sleeves out); it stays narrower than the stage box (STAGE_ASPECT in
 * the puppet scene) so every sprite is drawn at the same scale there. */
export const POSE_CANVAS_ASPECT = 1.5;
export const isPoseKey = (key: string) => (POSES as readonly string[]).includes(key) || key.startsWith('pose:');

const isPose = (k: SpriteKey): k is Pose => (POSES as readonly string[]).includes(k);

const inPose = (look: string) => `Show the full body, centred, the whole figure inside the frame with hands and feet visible, in this pose: ${look}.`;

/** The prompt for one sprite. Reference pictures (the series' character, then the neutral sprite) are sent next to it. */
export function expressionPrompt(sprite: SpriteKey): string {
  return spritePrompt(isPose(sprite) ? inPose(POSE_LOOK[sprite]) : `Show the full body, standing, facing the viewer, centred, with the feet fully visible, with ${LOOK[sprite]}.`);
}

/** The prompt for one of the series' own poses, from the person's description of it. */
export function customPosePrompt(description: string): string {
  // A described pose may hold something (a spear, a fan): only that object is allowed besides the character.
  return spritePrompt(inPose(description.trim().replace(/\.$/, '')), 'no props other than what the pose says the character holds');
}

function spritePrompt(body: string, props = 'no props'): string {
  return [
    'Redraw the exact same character shown in the reference picture(s): same face shape, colours, outfit, proportions and art style.',
    body,
    // Side and three-quarter views made the model drop flowing parts of the outfit (scarves, sashes, ribbons).
    'Keep every part of the outfit and accessories exactly as in the reference, seen from this angle: scarves, sashes, ribbons, belts, jewellery and hair ornaments must all still be there.',
    `Paint it on a perfectly flat, solid pure green (${CHROMA_HEX}) background that fills the whole frame: no ground, no shadow, no gradient, ${props}, no other characters, no text.`,
    'Do not use green anywhere on the character.',
  ].join(' ');
}

/** Sprites that still need a picture, neutral first: every other sprite is drawn from it, so it is added when missing. */
export function missingExpressions(have: Record<string, string>, wanted: readonly SpriteKey[] = EXPRESSIONS): SpriteKey[] {
  const todo = wanted.filter((e) => !have[e] && e !== 'neutral');
  return !have.neutral && (todo.length || wanted.includes('neutral')) ? ['neutral', ...todo] : todo;
}
