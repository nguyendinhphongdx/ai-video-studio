// The database tables. Postgres; drizzle-kit generates the migrations in drizzle/ from this file
// (`npm run db:generate`), and the app applies them when it starts.
import { sql } from 'drizzle-orm';
import { type AnyPgColumn, boolean, customType, doublePrecision, index, integer, pgTable, primaryKey, real, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * A `timestamptz` that the code reads and writes as an ISO string ("2026-11-27T10:43:09.650Z"), as it always has:
 * comparing and sorting stay correct, and the database can do date arithmetic.
 */
const isoTime = customType<{ data: string; driverData: string | Date }>({
  dataType: () => 'timestamp with time zone',
  toDriver: (v) => v,
  fromDriver: (v) => new Date(v).toISOString(),
});

/**
 * A `jsonb` that the code reads and writes as JSON text (repositories JSON.stringify on write and `json()` on read).
 * The text is sent as a parameter cast to jsonb (so a driver never stores a JSON string of it, and JSON null stays
 * JSON null); the drivers parse jsonb into values, so it is turned back into text on the way out.
 */
const jsonText = customType<{ data: string; driverData: unknown }>({
  dataType: () => 'jsonb',
  toDriver: (v) => sql`${v}::jsonb`,
  fromDriver: (v) => JSON.stringify(v),
});


export const channels = pgTable(
  'channels',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    audience: text('audience').notNull(),
    style: text('style').notNull(),
    voice: text('voice').notNull(),
    outroText: text('outro_text').notNull(),
    subscribeText: text('subscribe_text').notNull(),
    hashtags: jsonText('hashtags').notNull().default('[]'),
    palette: jsonText('palette').notNull().default('[]'),
    music: text('music').notNull().default('music.wav'),
    logoPath: text('logo_path'),
    defaultSkillId: text('default_skill_id'),
    createdAt: isoTime('created_at').notNull(),
    updatedAt: isoTime('updated_at').notNull(),
    description: text('description').notNull().default(''),
    font: text('font').notNull().default('Baloo2'),
    introLook: text('intro_look').notNull().default('sky'),
    avatarPath: text('avatar_path'),
    imageStyle: text('image_style').notNull().default(''),
    introDesign: jsonText('intro_design'),
    outroDesign: jsonText('outro_design'),
    introArtPath: text('intro_art_path'),
    outroArtPath: text('outro_art_path'),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('channels_ws').on(t.workspaceId),
  ],
);

export const series = pgTable(
  'series',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id').notNull().references((): AnyPgColumn => channels.id),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    currentVersion: integer('current_version').notNull(),
    createdAt: isoTime('created_at').notNull(),
    updatedAt: isoTime('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('series_ws').on(t.workspaceId),
  ],
);

export const seriesVersions = pgTable(
  'series_versions',
  {
    seriesId: text('series_id').notNull().references((): AnyPgColumn => series.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    skillId: text('skill_id').notNull(),
    bible: jsonText('bible').notNull(),
    format: jsonText('format').notNull(),
    publish: jsonText('publish').notNull(),
    createdAt: isoTime('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.seriesId, t.version] }),
    index('series_versions_ws').on(t.workspaceId),
  ],
);

export const episodes = pgTable(
  'episodes',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id').notNull().references((): AnyPgColumn => channels.id),
    seriesId: text('series_id').references((): AnyPgColumn => series.id),
    seriesVersion: integer('series_version'),
    number: integer('number'),
    topic: text('topic').notNull(),
    goal: text('goal').notNull().default(''),
    notes: text('notes').notNull().default(''),
    skillId: text('skill_id').notNull(),
    status: text('status').notNull(),
    formats: jsonText('formats').notNull(),
    voice: text('voice').notNull(),
    music: boolean('music').notNull(),
    /** Level of the background music under the voice, 0-1. */
    musicVolume: real('music_volume').notNull().default(0.12),
    sceneCount: integer('scene_count'),
    title: text('title').notNull().default(''),
    publish: jsonText('publish'),
    createdAt: isoTime('created_at').notNull(),
    updatedAt: isoTime('updated_at').notNull(),
    knowledgeVersion: integer('knowledge_version'),
    autoImages: boolean('auto_images').notNull().default(false),
    autoVoice: boolean('auto_voice').notNull().default(false),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('episodes_ws').on(t.workspaceId),
    uniqueIndex('episodes_series_number').on(t.seriesId, t.number),
    index('episodes_created').on(t.createdAt),
  ],
);

export const scenes = pgTable(
  'scenes',
  {
    id: text('id').primaryKey(),
    episodeId: text('episode_id').notNull().references((): AnyPgColumn => episodes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    slotId: text('slot_id').notNull(),
    block: text('block').notNull(),
    locked: boolean('locked').notNull().default(false),
    narration: text('narration').notNull(),
    props: jsonText('props').notNull(),
    approved: boolean('approved').notNull().default(false),
    imagePath: text('image_path'),
    imageHash: text('image_hash'),
    voicePath: text('voice_path'),
    voiceSeconds: doublePrecision('voice_seconds'),
    voiceHash: text('voice_hash'),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('scenes_ws').on(t.workspaceId),
    index('scenes_episode').on(t.episodeId, t.position),
  ],
);

export const renders = pgTable(
  'renders',
  {
    id: text('id').primaryKey(),
    episodeId: text('episode_id').notNull().references((): AnyPgColumn => episodes.id, { onDelete: 'cascade' }),
    format: text('format').notNull(),
    filePath: text('file_path').notNull(),
    durationSec: doublePrecision('duration_sec').notNull(),
    createdAt: isoTime('created_at').notNull(),
    thumbnailPath: text('thumbnail_path'),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('renders_ws').on(t.workspaceId),
  ],
);

export const episodeMemory = pgTable(
  'episode_memory',
  {
    episodeId: text('episode_id').primaryKey().references((): AnyPgColumn => episodes.id, { onDelete: 'cascade' }),
    seriesId: text('series_id').notNull().references((): AnyPgColumn => series.id, { onDelete: 'cascade' }),
    number: integer('number'),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    concepts: jsonText('concepts').notNull(),
    examples: jsonText('examples').notNull(),
    vocabulary: jsonText('vocabulary').notNull(),
    jokes: jsonText('jokes').notNull(),
    createdAt: isoTime('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('episode_memory_ws').on(t.workspaceId),
  ],
);

export const seriesMemory = pgTable(
  'series_memory',
  {
    seriesId: text('series_id').primaryKey().references((): AnyPgColumn => series.id, { onDelete: 'cascade' }),
    seasonSummary: text('season_summary').notNull(),
    updatedAt: isoTime('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('series_memory_ws').on(t.workspaceId),
  ],
);

export const stepRuns = pgTable(
  'step_runs',
  {
    episodeId: text('episode_id').notNull().references((): AnyPgColumn => episodes.id, { onDelete: 'cascade' }),
    step: text('step').notNull(),
    inputsHash: text('inputs_hash').notNull(),
    outputs: jsonText('outputs').notNull(),
    updatedAt: isoTime('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.episodeId, t.step] }),
    index('step_runs_ws').on(t.workspaceId),
  ],
);

export const aiRuns = pgTable(
  'ai_runs',
  {
    id: text('id').primaryKey(),
    episodeId: text('episode_id').references((): AnyPgColumn => episodes.id, { onDelete: 'cascade' }),
    seriesId: text('series_id'),
    task: text('task').notNull(),
    taskVersion: integer('task_version').notNull(),
    model: text('model'),
    context: text('context').notNull(),
    sections: jsonText('sections').notNull(),
    prompt: text('prompt').notNull(),
    output: jsonText('output'),
    error: text('error'),
    durationMs: integer('duration_ms').notNull(),
    createdAt: isoTime('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('ai_runs_ws').on(t.workspaceId),
    index('ai_runs_episode').on(t.episodeId, t.createdAt),
  ],
);

export const outbox = pgTable(
  'outbox',
  {
    id: serial('id').primaryKey(),
    type: text('type').notNull(),
    payload: jsonText('payload').notNull(),
    createdAt: isoTime('created_at').notNull(),
    handledAt: isoTime('handled_at'),
    error: text('error'),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('outbox_ws').on(t.workspaceId),
    index('outbox_pending').on(t.handledAt, t.id),
  ],
);

export const episodeEvents = pgTable(
  'episode_events',
  {
    id: serial('id').primaryKey(),
    episodeId: text('episode_id').notNull().references((): AnyPgColumn => episodes.id, { onDelete: 'cascade' }),
    at: isoTime('at').notNull(),
    message: text('message').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('episode_events_ws').on(t.workspaceId),
    index('events_episode').on(t.episodeId, t.id),
  ],
);

export const jobs = pgTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    episodeId: text('episode_id').references((): AnyPgColumn => episodes.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    payload: jsonText('payload').notNull().default('{}'),
    state: text('state').notNull(),
    progress: doublePrecision('progress').notNull().default(0),
    phase: text('phase'),
    error: text('error'),
    result: jsonText('result'),
    createdAt: isoTime('created_at').notNull(),
    startedAt: isoTime('started_at'),
    finishedAt: isoTime('finished_at'),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('jobs_ws').on(t.workspaceId),
    index('jobs_episode').on(t.episodeId, t.createdAt),
    index('jobs_queue').on(t.state, t.createdAt),
  ],
);

export const channelSkills = pgTable(
  'channel_skills',
  {
    channelId: text('channel_id').notNull().references((): AnyPgColumn => channels.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull(),
    markdown: text('markdown').notNull(),
    source: text('source').notNull().default('custom'),
    createdAt: isoTime('created_at').notNull(),
    updatedAt: isoTime('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.skillId] }),
    index('channel_skills_ws').on(t.workspaceId),
  ],
);

export const channelKnowledgeVersions = pgTable(
  'channel_knowledge_versions',
  {
    channelId: text('channel_id').notNull().references((): AnyPgColumn => channels.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    markdown: text('markdown').notNull(),
    note: text('note').notNull().default(''),
    createdAt: isoTime('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.version] }),
    index('channel_knowledge_versions_ws').on(t.workspaceId),
  ],
);

export const assistantThreads = pgTable(
  'assistant_threads',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id').notNull().references((): AnyPgColumn => channels.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    mode: text('mode').notNull().default('auto'),
    /** The person pressed stop; the worker ends the turn and the next message clears it. */
    stopRequested: integer('stop_requested').notNull().default(0),
    createdAt: isoTime('created_at').notNull(),
    updatedAt: isoTime('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('assistant_threads_ws').on(t.workspaceId),
  ],
);

export const assistantMessages = pgTable(
  'assistant_messages',
  {
    id: serial('id').primaryKey(),
    threadId: text('thread_id').notNull().references((): AnyPgColumn => assistantThreads.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull().default(''),
    toolCalls: jsonText('tool_calls').notNull().default('[]'),
    toolCallId: text('tool_call_id'),
    toolName: text('tool_name'),
    status: text('status').notNull().default('done'),
    summary: text('summary').notNull().default(''),
    data: jsonText('data'),
    focus: jsonText('focus'),
    createdAt: isoTime('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('assistant_messages_ws').on(t.workspaceId),
    index('assistant_messages_thread').on(t.threadId, t.id),
  ],
);

/** AG-UI events of the running turn of a conversation, in order; emptied when its next turn is queued. */
export const assistantStreamEvents = pgTable(
  'assistant_stream_events',
  {
    id: serial('id').primaryKey(),
    threadId: text('thread_id').notNull().references((): AnyPgColumn => assistantThreads.id, { onDelete: 'cascade' }),
    event: jsonText('event').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('assistant_stream_events_ws').on(t.workspaceId),
    index('assistant_stream_events_thread').on(t.threadId, t.id),
  ],
);

/** A connection code: lets an outside AI act in the workspace over MCP. Only its hash is kept. */
export const mcpCodes = pgTable(
  'mcp_codes',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    codeHash: text('code_hash').notNull(),
    level: text('level').notNull(),
    createdAt: isoTime('created_at').notNull(),
    expiresAt: isoTime('expires_at'),
    revokedAt: isoTime('revoked_at'),
    lastUsedAt: isoTime('last_used_at'),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('mcp_codes_ws').on(t.workspaceId),
    uniqueIndex('mcp_codes_hash').on(t.codeHash),
  ],
);

/** What each code did. Arguments are not kept. */
export const mcpCalls = pgTable(
  'mcp_calls',
  {
    id: serial('id').primaryKey(),
    codeId: text('code_id').notNull().references((): AnyPgColumn => mcpCodes.id, { onDelete: 'cascade' }),
    tool: text('tool').notNull(),
    summary: text('summary').notNull(),
    ok: boolean('ok').notNull(),
    at: isoTime('at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('mcp_calls_ws').on(t.workspaceId),
    index('mcp_calls_code').on(t.codeId, t.id),
  ],
);

/** A one-time link that accepts one file for one purpose without signing in. */
export const mcpUploads = pgTable(
  'mcp_uploads',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    purpose: text('purpose').notNull(),
    target: jsonText('target').notNull(),
    expiresAt: isoTime('expires_at').notNull(),
    usedAt: isoTime('used_at'),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('mcp_uploads_ws').on(t.workspaceId),
    uniqueIndex('mcp_uploads_hash').on(t.tokenHash),
  ],
);

export const usageEvents = pgTable(
  'usage_events',
  {
    id: text('id').primaryKey(),
    at: isoTime('at').notNull(),
    kind: text('kind').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    purpose: text('purpose').notNull().default(''),
    channelId: text('channel_id'),
    seriesId: text('series_id'),
    episodeId: text('episode_id'),
    sceneId: text('scene_id'),
    jobId: text('job_id'),
    threadId: text('thread_id'),
    runId: text('run_id'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cachedTokens: integer('cached_tokens').notNull().default(0),
    units: doublePrecision('units').notNull().default(0),
    costUsd: doublePrecision('cost_usd'),
    estimated: boolean('estimated').notNull().default(false),
    durationMs: integer('duration_ms').notNull().default(0),
    /** Where the work was asked from: '' (the studio) or 'mcp'. */
    via: text('via').notNull().default(''),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('usage_events_ws').on(t.workspaceId),
    index('usage_episode').on(t.episodeId),
    index('usage_channel').on(t.channelId, t.at),
    index('usage_at').on(t.at),
  ],
);

export const priceBook = pgTable('price_book', {
  id: serial('id').primaryKey(),
  kind: text('kind').notNull(),
  provider: text('provider'),
  pattern: text('pattern').notNull(),
  inputPerMtok: doublePrecision('input_per_mtok').notNull().default(0),
  outputPerMtok: doublePrecision('output_per_mtok').notNull().default(0),
  cachedPerMtok: doublePrecision('cached_per_mtok').notNull().default(0),
  perUnit: doublePrecision('per_unit').notNull().default(0),
  note: text('note').notNull().default(''),
  workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
});

export const budgets = pgTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    scope: text('scope').notNull(),
    channelId: text('channel_id'),
    period: text('period').notNull(),
    limitUsd: doublePrecision('limit_usd').notNull(),
    mode: text('mode').notNull().default('warn'),
    alertPct: integer('alert_pct').notNull().default(80),
    createdAt: isoTime('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('budgets_ws').on(t.workspaceId),
  ],
);

export const usagePrefs = pgTable('usage_prefs', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const appPrefs = pgTable('app_prefs', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: isoTime('created_at').notNull(),
});

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  usesSharedKeys: boolean('uses_shared_keys').notNull().default(false),
  userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  createdAt: isoTime('created_at').notNull(),
});

export const memberships = pgTable(
  'memberships',
  {
    workspaceId: text('workspace_id').notNull().references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: isoTime('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index('memberships_user').on(t.userId),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id').notNull().references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').references((): AnyPgColumn => workspaces.id, { onDelete: 'set null' }),
    createdAt: isoTime('created_at').notNull(),
    expiresAt: isoTime('expires_at').notNull(),
  },
  (t) => [
    index('sessions_user').on(t.userId),
  ],
);

export const workspacePrefs = pgTable(
  'workspace_prefs',
  {
    workspaceId: text('workspace_id').notNull().references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.key] }),
  ],
);

export const invites = pgTable(
  'invites',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    workspaceId: text('workspace_id').notNull().references((): AnyPgColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
    email: text('email').notNull().default(''),
    role: text('role').notNull().default('member'),
    createdAt: isoTime('created_at').notNull(),
    expiresAt: isoTime('expires_at').notNull(),
    usedAt: isoTime('used_at'),
    usedBy: text('used_by').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('invites_ws').on(t.workspaceId),
  ],
);
