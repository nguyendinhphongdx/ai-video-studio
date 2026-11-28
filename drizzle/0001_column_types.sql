-- Columns get their real types: ISO-text times -> timestamptz, JSON text -> jsonb, 0/1 flags -> boolean.
-- drizzle-kit wrote the type changes; the USING casts and the boolean defaults are added by hand.
ALTER TABLE "ai_runs" ALTER COLUMN "sections" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "ai_runs" ALTER COLUMN "sections" SET DATA TYPE jsonb USING "sections"::jsonb;
--> statement-breakpoint
ALTER TABLE "ai_runs" ALTER COLUMN "output" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "ai_runs" ALTER COLUMN "output" SET DATA TYPE jsonb USING "output"::jsonb;
--> statement-breakpoint
ALTER TABLE "ai_runs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "assistant_messages" ALTER COLUMN "tool_calls" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "assistant_messages" ALTER COLUMN "tool_calls" SET DATA TYPE jsonb USING "tool_calls"::jsonb;
--> statement-breakpoint
ALTER TABLE "assistant_messages" ALTER COLUMN "tool_calls" SET DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "assistant_messages" ALTER COLUMN "data" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "assistant_messages" ALTER COLUMN "data" SET DATA TYPE jsonb USING "data"::jsonb;
--> statement-breakpoint
ALTER TABLE "assistant_messages" ALTER COLUMN "focus" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "assistant_messages" ALTER COLUMN "focus" SET DATA TYPE jsonb USING "focus"::jsonb;
--> statement-breakpoint
ALTER TABLE "assistant_messages" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "assistant_threads" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "assistant_threads" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "channel_knowledge_versions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "channel_skills" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "channel_skills" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "hashtags" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "hashtags" SET DATA TYPE jsonb USING "hashtags"::jsonb;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "hashtags" SET DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "palette" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "palette" SET DATA TYPE jsonb USING "palette"::jsonb;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "palette" SET DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "intro_design" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "intro_design" SET DATA TYPE jsonb USING "intro_design"::jsonb;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "outro_design" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "outro_design" SET DATA TYPE jsonb USING "outro_design"::jsonb;
--> statement-breakpoint
ALTER TABLE "episode_events" ALTER COLUMN "at" SET DATA TYPE timestamp with time zone USING "at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "episode_memory" ALTER COLUMN "concepts" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "episode_memory" ALTER COLUMN "concepts" SET DATA TYPE jsonb USING "concepts"::jsonb;
--> statement-breakpoint
ALTER TABLE "episode_memory" ALTER COLUMN "examples" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "episode_memory" ALTER COLUMN "examples" SET DATA TYPE jsonb USING "examples"::jsonb;
--> statement-breakpoint
ALTER TABLE "episode_memory" ALTER COLUMN "vocabulary" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "episode_memory" ALTER COLUMN "vocabulary" SET DATA TYPE jsonb USING "vocabulary"::jsonb;
--> statement-breakpoint
ALTER TABLE "episode_memory" ALTER COLUMN "jokes" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "episode_memory" ALTER COLUMN "jokes" SET DATA TYPE jsonb USING "jokes"::jsonb;
--> statement-breakpoint
ALTER TABLE "episode_memory" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "formats" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "formats" SET DATA TYPE jsonb USING "formats"::jsonb;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "music" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "music" SET DATA TYPE boolean USING "music" <> 0;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "publish" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "publish" SET DATA TYPE jsonb USING "publish"::jsonb;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "auto_images" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "auto_images" SET DATA TYPE boolean USING "auto_images" <> 0;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "auto_images" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "auto_voice" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "auto_voice" SET DATA TYPE boolean USING "auto_voice" <> 0;
--> statement-breakpoint
ALTER TABLE "episodes" ALTER COLUMN "auto_voice" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "invites" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "invites" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "invites" ALTER COLUMN "used_at" SET DATA TYPE timestamp with time zone USING "used_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "payload" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "payload" SET DATA TYPE jsonb USING "payload"::jsonb;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "payload" SET DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "result" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "result" SET DATA TYPE jsonb USING "result"::jsonb;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "started_at" SET DATA TYPE timestamp with time zone USING "started_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "finished_at" SET DATA TYPE timestamp with time zone USING "finished_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "outbox" ALTER COLUMN "payload" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "outbox" ALTER COLUMN "payload" SET DATA TYPE jsonb USING "payload"::jsonb;
--> statement-breakpoint
ALTER TABLE "outbox" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "outbox" ALTER COLUMN "handled_at" SET DATA TYPE timestamp with time zone USING "handled_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "renders" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "scenes" ALTER COLUMN "locked" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "scenes" ALTER COLUMN "locked" SET DATA TYPE boolean USING "locked" <> 0;
--> statement-breakpoint
ALTER TABLE "scenes" ALTER COLUMN "locked" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "scenes" ALTER COLUMN "props" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "scenes" ALTER COLUMN "props" SET DATA TYPE jsonb USING "props"::jsonb;
--> statement-breakpoint
ALTER TABLE "scenes" ALTER COLUMN "approved" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "scenes" ALTER COLUMN "approved" SET DATA TYPE boolean USING "approved" <> 0;
--> statement-breakpoint
ALTER TABLE "scenes" ALTER COLUMN "approved" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "series" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "series" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "series_memory" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "series_versions" ALTER COLUMN "bible" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "series_versions" ALTER COLUMN "bible" SET DATA TYPE jsonb USING "bible"::jsonb;
--> statement-breakpoint
ALTER TABLE "series_versions" ALTER COLUMN "format" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "series_versions" ALTER COLUMN "format" SET DATA TYPE jsonb USING "format"::jsonb;
--> statement-breakpoint
ALTER TABLE "series_versions" ALTER COLUMN "publish" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "series_versions" ALTER COLUMN "publish" SET DATA TYPE jsonb USING "publish"::jsonb;
--> statement-breakpoint
ALTER TABLE "series_versions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "step_runs" ALTER COLUMN "outputs" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "step_runs" ALTER COLUMN "outputs" SET DATA TYPE jsonb USING "outputs"::jsonb;
--> statement-breakpoint
ALTER TABLE "step_runs" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "usage_events" ALTER COLUMN "at" SET DATA TYPE timestamp with time zone USING "at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "usage_events" ALTER COLUMN "estimated" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "usage_events" ALTER COLUMN "estimated" SET DATA TYPE boolean USING "estimated" <> 0;
--> statement-breakpoint
ALTER TABLE "usage_events" ALTER COLUMN "estimated" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_admin" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_admin" SET DATA TYPE boolean USING "is_admin" <> 0;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_admin" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "uses_shared_keys" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "uses_shared_keys" SET DATA TYPE boolean USING "uses_shared_keys" <> 0;
--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "uses_shared_keys" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
