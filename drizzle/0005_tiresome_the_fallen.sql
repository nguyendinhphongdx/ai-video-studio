CREATE TABLE "changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"ref" text NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changes_ws" ON "changes" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "changes_at" ON "changes" USING btree ("at");