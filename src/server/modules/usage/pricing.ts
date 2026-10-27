import type { PriceRow } from '@/core/usage/cost';

/**
 * Starting prices (USD). They are reference values that go stale: the price book is editable on the Cost screen and
 * every recorded cost keeps the price it was computed with.
 */
const NOTE = 'Giá tham khảo, kiểm tra lại trên trang giá của nhà cung cấp';
const llm = (provider: string, pattern: string, input: number, output: number, cached: number): Omit<PriceRow, 'id'> => ({ kind: 'llm', provider, pattern, inputPerMtok: input, outputPerMtok: output, cachedPerMtok: cached, perUnit: 0, note: NOTE });

export const DEFAULT_PRICES: Omit<PriceRow, 'id'>[] = [
  llm('gemini', 'flash-lite', 0.1, 0.4, 0.025),
  llm('gemini', 'flash', 0.3, 2.5, 0.075),
  llm('gemini', 'pro', 1.25, 10, 0.31),
  llm('anthropic', 'haiku', 1, 5, 0.1),
  llm('anthropic', 'sonnet', 3, 15, 0.3),
  llm('anthropic', 'opus', 15, 75, 1.5),
  llm('openai', 'gpt-4o-mini', 0.15, 0.6, 0.075),
  llm('openai', 'gpt-4o', 2.5, 10, 1.25),
  llm('openai', 'gpt-4.1', 2, 8, 0.5),
  { ...llm('openai-compatible', '', 0, 0, 0), note: 'Máy chủ riêng (Ollama, LM Studio…): tính miễn phí' },
  { kind: 'image', provider: 'gemini', pattern: 'image', inputPerMtok: 0, outputPerMtok: 0, cachedPerMtok: 0, perUnit: 0.039, note: NOTE },
  { kind: 'image', provider: 'openai', pattern: 'gpt-image', inputPerMtok: 0, outputPerMtok: 0, cachedPerMtok: 0, perUnit: 0.04, note: NOTE },
  { kind: 'tts', provider: 'gemini', pattern: 'tts', inputPerMtok: 0.5, outputPerMtok: 10, cachedPerMtok: 0, perUnit: 0, note: `${NOTE} (giọng tính theo token âm thanh)` },
  { kind: 'tts', provider: 'edge', pattern: '', inputPerMtok: 0, outputPerMtok: 0, cachedPerMtok: 0, perUnit: 0, note: 'Giọng Edge miễn phí' },
];
