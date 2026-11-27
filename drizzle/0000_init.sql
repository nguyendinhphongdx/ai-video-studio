CREATE TABLE "ai_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text,
	"series_id" text,
	"task" text NOT NULL,
	"task_version" integer NOT NULL,
	"model" text,
	"context" text NOT NULL,
	"sections" text NOT NULL,
	"prompt" text NOT NULL,
	"output" text,
	"error" text,
	"duration_ms" integer NOT NULL,
	"created_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "app_prefs" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"tool_calls" text DEFAULT '[]' NOT NULL,
	"tool_call_id" text,
	"tool_name" text,
	"status" text DEFAULT 'done' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"data" text,
	"focus" text,
	"created_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "assistant_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"mode" text DEFAULT 'auto' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"channel_id" text,
	"period" text NOT NULL,
	"limit_usd" double precision NOT NULL,
	"mode" text DEFAULT 'warn' NOT NULL,
	"alert_pct" integer DEFAULT 80 NOT NULL,
	"created_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "channel_knowledge_versions" (
	"channel_id" text NOT NULL,
	"version" integer NOT NULL,
	"markdown" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text,
	CONSTRAINT "channel_knowledge_versions_channel_id_version_pk" PRIMARY KEY("channel_id","version")
);
--> statement-breakpoint
CREATE TABLE "channel_skills" (
	"channel_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"markdown" text NOT NULL,
	"source" text DEFAULT 'custom' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text,
	CONSTRAINT "channel_skills_channel_id_skill_id_pk" PRIMARY KEY("channel_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"audience" text NOT NULL,
	"style" text NOT NULL,
	"voice" text NOT NULL,
	"outro_text" text NOT NULL,
	"subscribe_text" text NOT NULL,
	"hashtags" text DEFAULT '[]' NOT NULL,
	"palette" text DEFAULT '[]' NOT NULL,
	"music" text DEFAULT 'music.wav' NOT NULL,
	"logo_path" text,
	"default_skill_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"font" text DEFAULT 'Baloo2' NOT NULL,
	"intro_look" text DEFAULT 'sky' NOT NULL,
	"avatar_path" text,
	"image_style" text DEFAULT '' NOT NULL,
	"intro_design" text,
	"outro_design" text,
	"intro_art_path" text,
	"outro_art_path" text,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "episode_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"at" text NOT NULL,
	"message" text NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "episode_memory" (
	"episode_id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"number" integer,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"concepts" text NOT NULL,
	"examples" text NOT NULL,
	"vocabulary" text NOT NULL,
	"jokes" text NOT NULL,
	"created_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"series_id" text,
	"series_version" integer,
	"number" integer,
	"topic" text NOT NULL,
	"goal" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"skill_id" text NOT NULL,
	"status" text NOT NULL,
	"formats" text NOT NULL,
	"voice" text NOT NULL,
	"music" integer NOT NULL,
	"scene_count" integer,
	"title" text DEFAULT '' NOT NULL,
	"publish" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"knowledge_version" integer,
	"auto_images" integer DEFAULT 0 NOT NULL,
	"auto_voice" integer DEFAULT 0 NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text,
	"email" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	"used_by" text
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text,
	"kind" text NOT NULL,
	"payload" text DEFAULT '{}' NOT NULL,
	"state" text NOT NULL,
	"progress" double precision DEFAULT 0 NOT NULL,
	"phase" text,
	"error" text,
	"result" text,
	"created_at" text NOT NULL,
	"started_at" text,
	"finished_at" text,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "memberships_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" text NOT NULL,
	"created_at" text NOT NULL,
	"handled_at" text,
	"error" text,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "price_book" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"provider" text,
	"pattern" text NOT NULL,
	"input_per_mtok" double precision DEFAULT 0 NOT NULL,
	"output_per_mtok" double precision DEFAULT 0 NOT NULL,
	"cached_per_mtok" double precision DEFAULT 0 NOT NULL,
	"per_unit" double precision DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "renders" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"format" text NOT NULL,
	"file_path" text NOT NULL,
	"duration_sec" double precision NOT NULL,
	"created_at" text NOT NULL,
	"thumbnail_path" text,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"position" integer NOT NULL,
	"slot_id" text NOT NULL,
	"block" text NOT NULL,
	"locked" integer DEFAULT 0 NOT NULL,
	"narration" text NOT NULL,
	"props" text NOT NULL,
	"approved" integer DEFAULT 0 NOT NULL,
	"image_path" text,
	"image_hash" text,
	"voice_path" text,
	"voice_seconds" double precision,
	"voice_hash" text,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_version" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "series_memory" (
	"series_id" text PRIMARY KEY NOT NULL,
	"season_summary" text NOT NULL,
	"updated_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "series_versions" (
	"series_id" text NOT NULL,
	"version" integer NOT NULL,
	"skill_id" text NOT NULL,
	"bible" text NOT NULL,
	"format" text NOT NULL,
	"publish" text NOT NULL,
	"created_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text,
	CONSTRAINT "series_versions_series_id_version_pk" PRIMARY KEY("series_id","version")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "step_runs" (
	"episode_id" text NOT NULL,
	"step" text NOT NULL,
	"inputs_hash" text NOT NULL,
	"outputs" text NOT NULL,
	"updated_at" text NOT NULL,
	"workspace_id" text,
	"user_id" text,
	CONSTRAINT "step_runs_episode_id_step_pk" PRIMARY KEY("episode_id","step")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"at" text NOT NULL,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"purpose" text DEFAULT '' NOT NULL,
	"channel_id" text,
	"series_id" text,
	"episode_id" text,
	"scene_id" text,
	"job_id" text,
	"thread_id" text,
	"run_id" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"units" double precision DEFAULT 0 NOT NULL,
	"cost_usd" double precision,
	"estimated" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "usage_prefs" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"is_admin" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_prefs" (
	"workspace_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"user_id" text,
	CONSTRAINT "workspace_prefs_workspace_id_key_pk" PRIMARY KEY("workspace_id","key")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"uses_shared_keys" integer DEFAULT 0 NOT NULL,
	"user_id" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_threads" ADD CONSTRAINT "assistant_threads_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_threads" ADD CONSTRAINT "assistant_threads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_threads" ADD CONSTRAINT "assistant_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_knowledge_versions" ADD CONSTRAINT "channel_knowledge_versions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_knowledge_versions" ADD CONSTRAINT "channel_knowledge_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_knowledge_versions" ADD CONSTRAINT "channel_knowledge_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_skills" ADD CONSTRAINT "channel_skills_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_skills" ADD CONSTRAINT "channel_skills_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_skills" ADD CONSTRAINT "channel_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_events" ADD CONSTRAINT "episode_events_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_events" ADD CONSTRAINT "episode_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_events" ADD CONSTRAINT "episode_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_memory" ADD CONSTRAINT "episode_memory_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_memory" ADD CONSTRAINT "episode_memory_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_memory" ADD CONSTRAINT "episode_memory_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_memory" ADD CONSTRAINT "episode_memory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_book" ADD CONSTRAINT "price_book_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_book" ADD CONSTRAINT "price_book_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_memory" ADD CONSTRAINT "series_memory_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_memory" ADD CONSTRAINT "series_memory_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_memory" ADD CONSTRAINT "series_memory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_versions" ADD CONSTRAINT "series_versions_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_versions" ADD CONSTRAINT "series_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_versions" ADD CONSTRAINT "series_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_runs" ADD CONSTRAINT "step_runs_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_runs" ADD CONSTRAINT "step_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_runs" ADD CONSTRAINT "step_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_prefs" ADD CONSTRAINT "workspace_prefs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_prefs" ADD CONSTRAINT "workspace_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_runs_ws" ON "ai_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ai_runs_episode" ON "ai_runs" USING btree ("episode_id","created_at");--> statement-breakpoint
CREATE INDEX "assistant_messages_ws" ON "assistant_messages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "assistant_messages_thread" ON "assistant_messages" USING btree ("thread_id","id");--> statement-breakpoint
CREATE INDEX "assistant_threads_ws" ON "assistant_threads" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "budgets_ws" ON "budgets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "channel_knowledge_versions_ws" ON "channel_knowledge_versions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "channel_skills_ws" ON "channel_skills" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "channels_ws" ON "channels" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "episode_events_ws" ON "episode_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "events_episode" ON "episode_events" USING btree ("episode_id","id");--> statement-breakpoint
CREATE INDEX "episode_memory_ws" ON "episode_memory" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "episodes_ws" ON "episodes" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_series_number" ON "episodes" USING btree ("series_id","number");--> statement-breakpoint
CREATE INDEX "episodes_created" ON "episodes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invites_ws" ON "invites" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "jobs_ws" ON "jobs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "jobs_episode" ON "jobs" USING btree ("episode_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_queue" ON "jobs" USING btree ("state","created_at");--> statement-breakpoint
CREATE INDEX "memberships_user" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "outbox_ws" ON "outbox" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "outbox_pending" ON "outbox" USING btree ("handled_at","id");--> statement-breakpoint
CREATE INDEX "renders_ws" ON "renders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "scenes_ws" ON "scenes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "scenes_episode" ON "scenes" USING btree ("episode_id","position");--> statement-breakpoint
CREATE INDEX "series_ws" ON "series" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "series_memory_ws" ON "series_memory" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "series_versions_ws" ON "series_versions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "step_runs_ws" ON "step_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "usage_events_ws" ON "usage_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "usage_episode" ON "usage_events" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "usage_channel" ON "usage_events" USING btree ("channel_id","at");--> statement-breakpoint
CREATE INDEX "usage_at" ON "usage_events" USING btree ("at");