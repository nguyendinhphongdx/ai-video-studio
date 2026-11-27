// AI connections (writing model and picture model), at two levels:
// - a workspace's own, saved in workspace_prefs ('ai_settings'), edited by the workspace's owner;
// - the system's shared one, saved to data/settings.json (gitignored, 0600, atomic write) plus env vars, edited by the
//   system admin. A workspace without a working connection of its own falls back to the shared one only when the admin
//   allows it (workspaces.uses_shared_keys). Which workspace is asking always comes from ctx().
import fs from 'node:fs/promises';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';

import { ctx, requireAdmin, requireOwner } from '@/server/context';
import { orm, owner, scoped } from '@/server/orm';
import { workspacePrefs } from '@/server/schema';
import { ApiError } from '@/server/http/api-error';
import { SETTINGS_FILE } from '@/server/config';

import {
  EFFORTS,
  IMAGE_PROVIDERS,
  PROVIDERS,
  type ImageProviderId,
  type ImageSettings,
  type ImageSettingsInput,
  type LlmSettings,
  type LlmSettingsInput,
  type ProviderId,
  type PublicImageSettings,
  type PublicLlmSettings,
} from './settings.types';

type Saved = Partial<LlmSettings>;

type SavedImage = Partial<ImageSettings>;

type All = { llm?: Saved; image?: SavedImage };

/** Where one level of settings is kept, and whether env vars fill its gaps (only the shared level). */
interface Store {
  read(): Promise<All>;
  write(all: All): Promise<void>;
  env: boolean;
}

/** The system's shared connection: data/settings.json plus env vars. */
const sharedStore: Store = {
  env: true,
  async read() {
    try {
      return JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8'));
    } catch {
      return {};
    }
  },
  async write(data) {
    await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
    const tmp = `${SETTINGS_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await fs.rename(tmp, SETTINGS_FILE);
  },
};

const AI_KEY = 'ai_settings';
/** The current workspace's own connection (ctx().workspaceId), in workspace_prefs. */
const workspaceStore: Store = {
  env: false,
  async read() {
    const r = await orm().select({ value: workspacePrefs.value }).from(workspacePrefs).where(and(scoped(workspacePrefs), eq(workspacePrefs.key, AI_KEY))).get();
    try {
      return r ? (JSON.parse(r.value) as All) : {};
    } catch {
      return {};
    }
  },
  async write(all) {
    const by = owner();
    const value = JSON.stringify(all);
    await orm().insert(workspacePrefs).values({ ...by, key: AI_KEY, value }).onConflictDoUpdate({ target: [workspacePrefs.workspaceId, workspacePrefs.key], set: { value, userId: by.userId } });
  },
};

function resolve(saved: Saved = {}, env = true): LlmSettings {
  const provider: ProviderId = saved.provider && saved.provider in PROVIDERS ? saved.provider : 'anthropic';
  const p = PROVIDERS[provider];
  const envModel = env && provider === 'anthropic' ? process.env.AVS_MODEL : undefined;
  return {
    provider,
    model: saved.model || envModel || p.defaultModel,
    apiKey: saved.apiKey || (env && p.envKey ? process.env[p.envKey] : '') || '',
    baseUrl: saved.baseUrl || p.baseUrl,
    effort: saved.effort && EFFORTS.includes(saved.effort) ? saved.effort : 'medium',
  };
}

/** Image key: its own setting, else the env var, else the AI key when the writing provider is the same company. */
function resolveImage(saved: SavedImage = {}, llm: LlmSettings, env = true): ImageSettings & { source: PublicImageSettings['keySource'] } {
  const provider: ImageProviderId = saved.provider && saved.provider in IMAGE_PROVIDERS ? saved.provider : 'gemini';
  const p = IMAGE_PROVIDERS[provider];
  const fromEnv = env ? (process.env[p.envKey] ?? '') : '';
  const fromLlm = llm.provider === p.llmProvider ? llm.apiKey : '';
  const apiKey = saved.apiKey || fromEnv || fromLlm;
  return { provider, model: saved.model || p.defaultModel, apiKey, source: saved.apiKey ? 'settings' : fromEnv ? 'env' : fromLlm ? 'llm' : null };
}

export function mergeImage(saved: SavedImage = {}, input: ImageSettingsInput = {}): SavedImage {
  const next: SavedImage = { ...saved };
  if (input.provider !== undefined) {
    if (saved.provider && saved.provider !== input.provider) {
      delete next.apiKey;
      delete next.model;
    }
    next.provider = input.provider;
  }
  if (input.model !== undefined) next.model = input.model.trim();
  const key = input.apiKey?.trim() ?? '';
  if (input.clearKey) delete next.apiKey;
  else if (key && !key.includes('…')) next.apiKey = key;
  return next;
}

export function isReady(llm: LlmSettings): boolean {
  if (!llm.model) return false;
  if (llm.provider === 'openai-compatible' && !llm.baseUrl) return false;
  return !PROVIDERS[llm.provider].needsKey || Boolean(llm.apiKey);
}

export const maskKey = (key: string) => (!key ? '' : key.length > 12 ? `${key.slice(0, 7)}…${key.slice(-4)}` : `…${key.slice(-2)}`);

/** An empty or masked key keeps the saved one; switching provider drops provider-specific values. */
export function mergeLlm(saved: Saved = {}, input: LlmSettingsInput = {}): Saved {
  const next: Saved = { ...saved };
  if (input.provider !== undefined) {
    if (!(input.provider in PROVIDERS)) throw new ApiError(400, 'validation_error', `Nhà cung cấp không hợp lệ: ${input.provider}`);
    if (saved.provider && saved.provider !== input.provider) {
      delete next.apiKey;
      delete next.model;
      delete next.baseUrl;
    }
    next.provider = input.provider;
  }
  if (input.model !== undefined) next.model = input.model.trim();
  if (input.baseUrl !== undefined) next.baseUrl = input.baseUrl.trim();
  if (input.effort !== undefined) next.effort = input.effort;
  const key = input.apiKey?.trim() ?? '';
  if (input.clearKey) delete next.apiKey;
  else if (key && !key.includes('…')) next.apiKey = key;
  return next;
}

/** Google key for Gemini voices at one level: its picture key (Gemini), else env, else a Gemini writing key. */
function googleKeyOf(all: All, env: boolean): string {
  const saved = !all.image?.provider || all.image.provider === 'gemini' ? all.image?.apiKey : '';
  const llm = resolve(all.llm, env);
  return saved || (env ? process.env.GEMINI_API_KEY : '') || (llm.provider === 'gemini' ? llm.apiKey : '') || '';
}

const imageReady = (i: ImageSettings) => Boolean(i.apiKey && i.model);

/** Reading and saving one level, for its settings screen. */
function editor(store: Store, guard: () => void, effective: () => Promise<{ llm: LlmSettings; image: ImageSettings; llmShared: boolean; imageShared: boolean; allowed: boolean }>) {
  return {
    async publicLlm(): Promise<PublicLlmSettings> {
      const saved = (await store.read()).llm ?? {};
      const llm = resolve(saved, store.env);
      const eff = await effective();
      return {
        ...llm,
        apiKey: maskKey(llm.apiKey),
        hasKey: Boolean(llm.apiKey),
        keySource: saved.apiKey ? 'settings' : llm.apiKey ? 'env' : null,
        ready: isReady(eff.llm),
        usingShared: eff.llmShared,
        sharedAllowed: eff.allowed,
      };
    },
    async saveLlm(input: LlmSettingsInput): Promise<PublicLlmSettings> {
      guard();
      const all = await store.read();
      await store.write({ ...all, llm: mergeLlm(all.llm, input) });
      return this.publicLlm();
    },
    /** Settings as they would be after saving `input`, without saving (for "Kiểm tra kết nối"). */
    async previewLlm(input: LlmSettingsInput): Promise<LlmSettings> {
      guard();
      const next = resolve(mergeLlm((await store.read()).llm, input), store.env);
      // No working own connection and no new key typed: test what the workspace really uses (the shared keys).
      if (!isReady(next) && !input.apiKey) {
        const eff = await effective();
        if (eff.llmShared) return eff.llm;
      }
      return next;
    },
    async publicImage(): Promise<PublicImageSettings> {
      const all = await store.read();
      const { source, ...img } = resolveImage(all.image, resolve(all.llm, store.env), store.env);
      const eff = await effective();
      return { ...img, apiKey: maskKey(img.apiKey), hasKey: Boolean(img.apiKey), keySource: source, ready: imageReady(eff.image), usingShared: eff.imageShared, sharedAllowed: eff.allowed };
    },
    async saveImage(input: ImageSettingsInput): Promise<PublicImageSettings> {
      guard();
      const all = await store.read();
      await store.write({ ...all, image: mergeImage(all.image, input) });
      return this.publicImage();
    },
    async previewImage(input: ImageSettingsInput): Promise<ImageSettings> {
      guard();
      const all = await store.read();
      const { source: _source, ...settings } = resolveImage(mergeImage(all.image, input), resolve(all.llm, store.env), store.env);
      if (!imageReady(settings) && !input.apiKey) {
        const eff = await effective();
        if (eff.imageShared) return eff.image;
      }
      return settings;
    },
  };
}

/**
 * What the current workspace actually uses: its own connection when it works, else the shared one when the admin
 * allows the workspace to use it, else its own (not ready: the adapters then say there is no AI connection).
 */
async function effective() {
  const own = await workspaceStore.read();
  const allowed = ctx().workspace.usesSharedKeys;
  const shared = allowed ? await sharedStore.read() : {};
  const ownLlm = resolve(own.llm, false);
  const sharedLlm = resolve(shared.llm, true);
  const llmShared = !isReady(ownLlm) && allowed && isReady(sharedLlm);
  const { source: _o, ...ownImage } = resolveImage(own.image, ownLlm, false);
  const { source: _s, ...sharedImage } = resolveImage(shared.image, sharedLlm, true);
  const imageShared = !imageReady(ownImage) && allowed && imageReady(sharedImage);
  const ownGoogle = googleKeyOf(own, false);
  return {
    llm: llmShared ? sharedLlm : ownLlm,
    image: imageShared ? sharedImage : ownImage,
    google: ownGoogle || (allowed ? googleKeyOf(shared, true) : ''),
    llmShared,
    imageShared,
    allowed,
  };
}

/** The shared level's screen shows its own state (the admin edits it for every workspace that may use it). */
async function sharedEffective() {
  const shared = await sharedStore.read();
  const llm = resolve(shared.llm, true);
  const { source: _s, ...image } = resolveImage(shared.image, llm, true);
  return { llm, image, llmShared: false, imageShared: false, allowed: true };
}

const workspaceEditor = editor(workspaceStore, requireOwner, effective);
const sharedEditor = editor(sharedStore, requireAdmin, sharedEffective);

export const settingsService = {
  /** Read fresh on every call so a save applies without restarting the app or the worker. */
  async llm(): Promise<LlmSettings> {
    return (await effective()).llm;
  },
  async image(): Promise<ImageSettings> {
    return (await effective()).image;
  },
  /** Google API key for Gemini TTS, by the same rule as the other connections. */
  async googleKey(): Promise<string> {
    return (await effective()).google;
  },

  // The current workspace's own connection (its owner's settings screen).
  publicLlm: () => workspaceEditor.publicLlm(),
  saveLlm: (input: LlmSettingsInput) => workspaceEditor.saveLlm(input),
  previewLlm: (input: LlmSettingsInput) => workspaceEditor.previewLlm(input),
  publicImage: () => workspaceEditor.publicImage(),
  saveImage: (input: ImageSettingsInput) => workspaceEditor.saveImage(input),
  previewImage: (input: ImageSettingsInput) => workspaceEditor.previewImage(input),

  /** The system's shared connection (the admin's screen). */
  shared: {
    publicLlm: () => (requireAdmin(), sharedEditor.publicLlm()),
    saveLlm: (input: LlmSettingsInput) => sharedEditor.saveLlm(input),
    publicImage: () => (requireAdmin(), sharedEditor.publicImage()),
    saveImage: (input: ImageSettingsInput) => sharedEditor.saveImage(input),
  },
};
