CREATE TABLE "mcp_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_id" text NOT NULL,
	"tool" text NOT NULL,
	"summary" text NOT NULL,
	"ok" boolean NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "mcp_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code_hash" text NOT NULL,
	"level" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "mcp_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"target" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"workspace_id" text,
	"user_id" text
);
--> statement-breakpoint
ALTER TABLE "usage_events" ADD COLUMN "via" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_calls" ADD CONSTRAINT "mcp_calls_code_id_mcp_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."mcp_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_calls" ADD CONSTRAINT "mcp_calls_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_calls" ADD CONSTRAINT "mcp_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_codes" ADD CONSTRAINT "mcp_codes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_codes" ADD CONSTRAINT "mcp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_uploads" ADD CONSTRAINT "mcp_uploads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_uploads" ADD CONSTRAINT "mcp_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_calls_ws" ON "mcp_calls" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "mcp_calls_code" ON "mcp_calls" USING btree ("code_id","id");--> statement-breakpoint
CREATE INDEX "mcp_codes_ws" ON "mcp_codes" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_codes_hash" ON "mcp_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "mcp_uploads_ws" ON "mcp_uploads" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_uploads_hash" ON "mcp_uploads" USING btree ("token_hash");