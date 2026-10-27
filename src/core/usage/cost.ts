// What a paid call used and what it cost. Pure: the server records the events, this only does the arithmetic.
export type UsageKind = 'llm' | 'image' | 'tts';

export interface Usage {
  /** Prompt tokens that were not served from the provider's cache. */
  inputTokens: number;
  outputTokens: number;
  /** Prompt tokens served from the cache (cheaper). */
  cachedTokens: number;
  /** Pictures for an image call, seconds of audio for a voice call. */
  units: number;
}

export const NO_USAGE: Usage = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, units: 0 };

/** One line of the price book. Money is USD. A model matches when its id contains `pattern` (longest pattern wins). */
export interface PriceRow {
  id: number;
  kind: UsageKind;
  /** Provider the row is for; null = any. */
  provider: string | null;
  pattern: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cachedPerMtok: number;
  /** Per picture (image rows). */
  perUnit: number;
  note: string;
}

export function pickPrice(rows: PriceRow[], kind: UsageKind, provider: string, model: string): PriceRow | null {
  const id = model.toLowerCase();
  const fits = rows.filter((r) => r.kind === kind && id.includes(r.pattern.toLowerCase()) && (r.provider === null || r.provider === provider));
  // A row that names the provider beats a generic one; then the more specific pattern wins.
  fits.sort((a, b) => Number(b.provider !== null) - Number(a.provider !== null) || b.pattern.length - a.pattern.length);
  return fits[0] ?? null;
}

export function costOf(u: Usage, p: PriceRow): number {
  const tokens = (u.inputTokens * p.inputPerMtok + u.cachedTokens * p.cachedPerMtok + u.outputTokens * p.outputPerMtok) / 1_000_000;
  return tokens + (p.perUnit ? u.units * p.perUnit : 0);
}

/** Rough token count when a provider reports none (about four characters per token). */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/** Gemini speech is billed as audio tokens, about this many per second of audio. */
export const TTS_TOKENS_PER_SECOND = 25;
