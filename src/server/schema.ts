// The database tables as Drizzle sees them. Generated from the SQL migrations in src/server/db.ts, which stay the
// source of truth until the move to Postgres (docs/PLAN-postgres.md). tests/server/schema.test.ts checks the two match.
import { type AnySQLiteColumn, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const channels = sqliteTable(
  'channels',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    audience: text('audience').notNull(),
    style: text('style').notNull(),
    voice: text('voice').notNull(),
    outroText: text('outro_text').notNull(),
    subscribeText: text('subscribe_text').notNull(),
    hashtags: text('hashtags').notNull().default('[]'),
    palette: text('palette').notNull().default('[]'),
    music: text('music').notNull().default('music.wav'),
    logoPath: text('logo_path'),
    defaultSkillId: text('default_skill_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    description: text('description').notNull().default(''),
    font: text('font').notNull().default('Baloo2'),
    introLook: text('intro_look').notNull().default('sky'),
    avatarPath: text('avatar_path'),
    imageStyle: text('image_style').notNull().default(''),
    introDesign: text('intro_design'),
    outroDesign: text('outro_design'),
    introArtPath: text('intro_art_path'),
    outroArtPath: text('outro_art_path'),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('channels_ws').on(t.workspaceId),
  ],
);

export const series = sqliteTable(
  'series',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id').notNull().references((): AnySQLiteColumn => channels.id),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    currentVersion: integer('current_version').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('series_ws').on(t.workspaceId),
  ],
);

export const seriesVersions = sqliteTable(
  'series_versions',
  {
    seriesId: text('series_id').notNull().references((): AnySQLiteColumn => series.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    skillId: text('skill_id').notNull(),
    bible: text('bible').notNull(),
    format: text('format').notNull(),
    publish: text('publish').notNull(),
    createdAt: text('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.seriesId, t.version] }),
    index('series_versions_ws').on(t.workspaceId),
  ],
);

export const episodes = sqliteTable(
  'episodes',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id').notNull().references((): AnySQLiteColumn => channels.id),
    seriesId: text('series_id').references((): AnySQLiteColumn => series.id),
    seriesVersion: integer('series_version'),
    number: integer('number'),
    topic: text('topic').notNull(),
    goal: text('goal').notNull().default(''),
    notes: text('notes').notNull().default(''),
    skillId: text('skill_id').notNull(),
    status: text('status').notNull(),
    formats: text('formats').notNull(),
    voice: text('voice').notNull(),
    music: integer('music').notNull(),
    sceneCount: integer('scene_count'),
    title: text('title').notNull().default(''),
    publish: text('publish'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    knowledgeVersion: integer('knowledge_version'),
    autoImages: integer('auto_images').notNull().default(0),
    autoVoice: integer('auto_voice').notNull().default(0),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('episodes_ws').on(t.workspaceId),
    uniqueIndex('episodes_series_number').on(t.seriesId, t.number),
    index('episodes_created').on(t.createdAt),
  ],
);

export const scenes = sqliteTable(
  'scenes',
  {
    id: text('id').primaryKey(),
    episodeId: text('episode_id').notNull().references((): AnySQLiteColumn => episodes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    slotId: text('slot_id').notNull(),
    block: text('block').notNull(),
    locked: integer('locked').notNull().default(0),
    narration: text('narration').notNull(),
    props: text('props').notNull(),
    approved: integer('approved').notNull().default(0),
    imagePath: text('image_path'),
    imageHash: text('image_hash'),
    voicePath: text('voice_path'),
    voiceSeconds: real('voice_seconds'),
    voiceHash: text('voice_hash'),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('scenes_ws').on(t.workspaceId),
    index('scenes_episode').on(t.episodeId, t.position),
  ],
);

export const renders = sqliteTable(
  'renders',
  {
    id: text('id').primaryKey(),
    episodeId: text('episode_id').notNull().references((): AnySQLiteColumn => episodes.id, { onDelete: 'cascade' }),
    format: text('format').notNull(),
    filePath: text('file_path').notNull(),
    durationSec: real('duration_sec').notNull(),
    createdAt: text('created_at').notNull(),
    thumbnailPath: text('thumbnail_path'),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('renders_ws').on(t.workspaceId),
  ],
);

export const episodeMemory = sqliteTable(
  'episode_memory',
  {
    episodeId: text('episode_id').primaryKey().references((): AnySQLiteColumn => episodes.id, { onDelete: 'cascade' }),
    seriesId: text('series_id').notNull().references((): AnySQLiteColumn => series.id, { onDelete: 'cascade' }),
    number: integer('number'),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    concepts: text('concepts').notNull(),
    examples: text('examples').notNull(),
    vocabulary: text('vocabulary').notNull(),
    jokes: text('jokes').notNull(),
    createdAt: text('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('episode_memory_ws').on(t.workspaceId),
  ],
);

export const seriesMemory = sqliteTable(
  'series_memory',
  {
    seriesId: text('series_id').primaryKey().references((): AnySQLiteColumn => series.id, { onDelete: 'cascade' }),
    seasonSummary: text('season_summary').notNull(),
    updatedAt: text('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('series_memory_ws').on(t.workspaceId),
  ],
);

export const stepRuns = sqliteTable(
  'step_runs',
  {
    episodeId: text('episode_id').notNull().references((): AnySQLiteColumn => episodes.id, { onDelete: 'cascade' }),
    step: text('step').notNull(),
    inputsHash: text('inputs_hash').notNull(),
    outputs: text('outputs').notNull(),
    updatedAt: text('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.episodeId, t.step] }),
    index('step_runs_ws').on(t.workspaceId),
  ],
);

export const aiRuns = sqliteTable(
  'ai_runs',
  {
    id: text('id').primaryKey(),
    episodeId: text('episode_id').references((): AnySQLiteColumn => episodes.id, { onDelete: 'cascade' }),
    seriesId: text('series_id'),
    task: text('task').notNull(),
    taskVersion: integer('task_version').notNull(),
    model: text('model'),
    context: text('context').notNull(),
    sections: text('sections').notNull(),
    prompt: text('prompt').notNull(),
    output: text('output'),
    error: text('error'),
    durationMs: integer('duration_ms').notNull(),
    createdAt: text('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('ai_runs_ws').on(t.workspaceId),
    index('ai_runs_episode').on(t.episodeId, t.createdAt),
  ],
);

export const outbox = sqliteTable(
  'outbox',
  {
    id: integer('id').primaryKey(),
    type: text('type').notNull(),
    payload: text('payload').notNull(),
    createdAt: text('created_at').notNull(),
    handledAt: text('handled_at'),
    error: text('error'),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('outbox_ws').on(t.workspaceId),
    index('outbox_pending').on(t.handledAt, t.id),
  ],
);

export const episodeEvents = sqliteTable(
  'episode_events',
  {
    id: integer('id').primaryKey(),
    episodeId: text('episode_id').notNull().references((): AnySQLiteColumn => episodes.id, { onDelete: 'cascade' }),
    at: text('at').notNull(),
    message: text('message').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('episode_events_ws').on(t.workspaceId),
    index('events_episode').on(t.episodeId, t.id),
  ],
);

export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    episodeId: text('episode_id').references((): AnySQLiteColumn => episodes.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    payload: text('payload').notNull().default('{}'),
    state: text('state').notNull(),
    progress: real('progress').notNull().default(0),
    phase: text('phase'),
    error: text('error'),
    result: text('result'),
    createdAt: text('created_at').notNull(),
    startedAt: text('started_at'),
    finishedAt: text('finished_at'),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('jobs_ws').on(t.workspaceId),
    index('jobs_episode').on(t.episodeId, t.createdAt),
    index('jobs_queue').on(t.state, t.createdAt),
  ],
);

export const channelSkills = sqliteTable(
  'channel_skills',
  {
    channelId: text('channel_id').notNull().references((): AnySQLiteColumn => channels.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull(),
    markdown: text('markdown').notNull(),
    source: text('source').notNull().default('custom'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.skillId] }),
    index('channel_skills_ws').on(t.workspaceId),
  ],
);

export const channelKnowledgeVersions = sqliteTable(
  'channel_knowledge_versions',
  {
    channelId: text('channel_id').notNull().references((): AnySQLiteColumn => channels.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    markdown: text('markdown').notNull(),
    note: text('note').notNull().default(''),
    createdAt: text('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.version] }),
    index('channel_knowledge_versions_ws').on(t.workspaceId),
  ],
);

export const assistantThreads = sqliteTable(
  'assistant_threads',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id').notNull().references((): AnySQLiteColumn => channels.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    mode: text('mode').notNull().default('auto'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('assistant_threads_ws').on(t.workspaceId),
  ],
);

export const assistantMessages = sqliteTable(
  'assistant_messages',
  {
    id: integer('id').primaryKey(),
    threadId: text('thread_id').notNull().references((): AnySQLiteColumn => assistantThreads.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull().default(''),
    toolCalls: text('tool_calls').notNull().default('[]'),
    toolCallId: text('tool_call_id'),
    toolName: text('tool_name'),
    status: text('status').notNull().default('done'),
    summary: text('summary').notNull().default(''),
    data: text('data'),
    focus: text('focus'),
    createdAt: text('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('assistant_messages_ws').on(t.workspaceId),
    index('assistant_messages_thread').on(t.threadId, t.id),
  ],
);

export const usageEvents = sqliteTable(
  'usage_events',
  {
    id: text('id').primaryKey(),
    at: text('at').notNull(),
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
    units: real('units').notNull().default(0),
    costUsd: real('cost_usd'),
    estimated: integer('estimated').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('usage_events_ws').on(t.workspaceId),
    index('usage_episode').on(t.episodeId),
    index('usage_channel').on(t.channelId, t.at),
    index('usage_at').on(t.at),
  ],
);

export const priceBook = sqliteTable('price_book', {
  id: integer('id').primaryKey(),
  kind: text('kind').notNull(),
  provider: text('provider'),
  pattern: text('pattern').notNull(),
  inputPerMtok: real('input_per_mtok').notNull().default(0),
  outputPerMtok: real('output_per_mtok').notNull().default(0),
  cachedPerMtok: real('cached_per_mtok').notNull().default(0),
  perUnit: real('per_unit').notNull().default(0),
  note: text('note').notNull().default(''),
  workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
});

export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    scope: text('scope').notNull(),
    channelId: text('channel_id'),
    period: text('period').notNull(),
    limitUsd: real('limit_usd').notNull(),
    mode: text('mode').notNull().default('warn'),
    alertPct: integer('alert_pct').notNull().default(80),
    createdAt: text('created_at').notNull(),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('budgets_ws').on(t.workspaceId),
  ],
);

export const usagePrefs = sqliteTable('usage_prefs', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const appPrefs = sqliteTable('app_prefs', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  usesSharedKeys: integer('uses_shared_keys').notNull().default(0),
  userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
});

export const memberships = sqliteTable(
  'memberships',
  {
    workspaceId: text('workspace_id').notNull().references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index('memberships_user').on(t.userId),
  ],
);

export const sessions = sqliteTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id').notNull().references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').references((): AnySQLiteColumn => workspaces.id, { onDelete: 'set null' }),
    createdAt: text('created_at').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (t) => [
    index('sessions_user').on(t.userId),
  ],
);

export const workspacePrefs = sqliteTable(
  'workspace_prefs',
  {
    workspaceId: text('workspace_id').notNull().references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.key] }),
  ],
);

export const invites = sqliteTable(
  'invites',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    workspaceId: text('workspace_id').notNull().references((): AnySQLiteColumn => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
    email: text('email').notNull().default(''),
    role: text('role').notNull().default('member'),
    createdAt: text('created_at').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    usedBy: text('used_by').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('invites_ws').on(t.workspaceId),
  ],
);
