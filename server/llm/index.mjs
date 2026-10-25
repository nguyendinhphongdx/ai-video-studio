// Pick the LLM adapter for the saved settings. Every adapter has generateSpec({ system, user, schema }) and ping().
import { PROVIDERS } from "../settings.mjs";
import { createAnthropic } from "./anthropic.mjs";
import { createOpenAI } from "./openai.mjs";

export function createLlm(llm) {
  switch (llm.provider) {
    case "anthropic":
      return createAnthropic(llm);
    case "openai":
    case "openai-compatible":
      return createOpenAI(llm);
    case "gemini":
      return createOpenAI({ ...llm, baseUrl: llm.baseUrl || PROVIDERS.gemini.baseUrl });
    default:
      throw new Error(`Nhà cung cấp AI không hợp lệ: ${llm.provider}`);
  }
}
