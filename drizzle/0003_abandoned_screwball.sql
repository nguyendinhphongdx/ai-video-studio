CREATE TABLE "assistant_stream_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"event" jsonb NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
ALTER TABLE "assistant_threads" ADD COLUMN "stop_requested" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assistant_stream_events" ADD CONSTRAINT "assistant_stream_events_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_stream_events" ADD CONSTRAINT "assistant_stream_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_stream_events" ADD CONSTRAINT "assistant_stream_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_stream_events_ws" ON "assistant_stream_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "assistant_stream_events_thread" ON "assistant_stream_events" USING btree ("thread_id","id");