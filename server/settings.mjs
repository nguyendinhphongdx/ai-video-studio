// App settings, edited in the UI (⚙️ Cài đặt) and saved to data/settings.json (gitignored).
// Saved values win; env vars (ANTHROPIC_API_KEY, AVS_MODEL) are only a fallback when a value is empty.
import fs from "node:fs/promises";
import path from "node:path";

export const SETTINGS_FILE = path.resolve(import.meta.dirname, "../data/settings.json");

export const PROVIDERS = {
  anthropic: {
    label: "Claude (Anthropic)",
    short: "Claude",
    needsKey: true,
    defaultModel: "claude-opus-5-5",
    models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"],
    envKey: "ANTHROPIC_API_KEY",
  },
  openai: { label: "OpenAI", short: "OpenAI", needsKey: true, defaultModel: "gpt-5", models: ["gpt-5", "gpt-5-mini"], envKey: "OPENAI_API_KEY" },
  gemini: {
    label: "Google Gemini",
    short: "Gemini",
    needsKey: true,
    defaultModel: "gemini-2.5-pro",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    envKey: "GEMINI_API_KEY",
  },
  "openai-compatible": {
    label: "OpenAI-compatible (Ollama, LM Studio, OpenRouter...)",
    short: "OpenAI-compatible",
    needsKey: false,
    defaultModel: "",
    models: ["llama3.1", "qwen2.5", "gemma3"],
    baseUrl: "http://localhost:11434/v1",
  },
};

export const EFFORTS = ["low", "medium", "high"];

async function readAll() {
  try {
    return JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writeAll(data) {
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  const tmp = `${SETTINGS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await fs.rename(tmp, SETTINGS_FILE);
}

/** Fill gaps in saved LLM settings from env and provider defaults. Includes the secret key: server-side only. */
function resolve(saved = {}) {
  const provider = PROVIDERS[saved.provider] ? saved.provider : "anthropic";
  const p = PROVIDERS[provider];
  const envModel = provider === "anthropic" ? process.env.AVS_MODEL : undefined;
  return {
    provider,
    model: saved.model || envModel || p.defaultModel,
    apiKey: saved.apiKey || (p.envKey && process.env[p.envKey]) || "",
    baseUrl: saved.baseUrl || p.baseUrl || "",
    effort: EFFORTS.includes(saved.effort) ? saved.effort : "medium",
  };
}

/** Effective LLM settings, read fresh on every call so changes apply without a restart. */
export async function getLlmSettings() {
  return resolve((await readAll()).llm);
}

export function llmReady(llm) {
  if (!llm.model) return false;
  if (llm.provider === "openai-compatible" && !llm.baseUrl) return false;
  return !PROVIDERS[llm.provider].needsKey || Boolean(llm.apiKey);
}

export function maskKey(key) {
  if (!key) return "";
  return key.length > 12 ? `${key.slice(0, 7)}…${key.slice(-4)}` : `…${key.slice(-2)}`;
}

/** What the browser may see: the key is replaced by a mask. */
export async function publicSettings() {
  const saved = (await readAll()).llm ?? {};
  const llm = resolve(saved);
  const { apiKey, ...rest } = llm;
  return {
    llm: {
      ...rest,
      apiKey: maskKey(apiKey),
      hasKey: Boolean(apiKey),
      keySource: saved.apiKey ? "settings" : apiKey ? "env" : null,
      ready: llmReady(llm),
    },
    providers: PROVIDERS,
    efforts: EFFORTS,
  };
}

/**
 * Apply a form submission on top of the saved settings. An empty or masked apiKey keeps the saved key,
 * unless the provider changed (a key belongs to one provider). clearKey: true removes it.
 */
export function mergeLlm(saved = {}, input = {}) {
  const next = { ...saved };
  if (input.provider !== undefined) {
    if (!PROVIDERS[input.provider]) throw new Error(`Nhà cung cấp không hợp lệ: ${input.provider}`);
    if (saved.provider && saved.provider !== input.provider) {
      delete next.apiKey;
      delete next.model;
      delete next.baseUrl;
    }
    next.provider = input.provider;
  }
  for (const k of ["model", "baseUrl"]) if (input[k] !== undefined) next[k] = String(input[k]).trim();
  if (input.effort !== undefined) {
    if (!EFFORTS.includes(input.effort)) throw new Error(`Mức suy nghĩ không hợp lệ: ${input.effort}`);
    next.effort = input.effort;
  }
  const key = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  if (input.clearKey) delete next.apiKey;
  else if (key && !key.includes("…")) next.apiKey = key;
  return next;
}

export async function saveLlmSettings(input) {
  const all = await readAll();
  all.llm = mergeLlm(all.llm, input);
  await writeAll(all);
  return publicSettings();
}

/** Settings as they would be after saving `input`, without saving (for "Kiểm tra kết nối"). */
export async function previewLlmSettings(input) {
  return resolve(mergeLlm((await readAll()).llm, input));
}
