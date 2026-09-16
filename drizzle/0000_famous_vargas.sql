CREATE TABLE "courses" (
	"week_key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"week_start" date NOT NULL,
	"seed" integer NOT NULL,
	"holes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"pin_hash" text NOT NULL,
	"handicap" integer DEFAULT 0 NOT NULL,
	"accent" text DEFAULT '#006747' NOT NULL,
	"emoji" text DEFAULT '🏌️' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"week_key" text NOT NULL,
	"handicap" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shots" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"day_index" integer NOT NULL,
	"slot" text NOT NULL,
	"outcome" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_week_key_courses_week_key_fk" FOREIGN KEY ("week_key") REFERENCES "public"."courses"("week_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "players_handle_idx" ON "players" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_player_week_idx" ON "rounds" USING btree ("player_id","week_key");--> statement-breakpoint
CREATE INDEX "rounds_week_idx" ON "rounds" USING btree ("week_key");--> statement-breakpoint
CREATE UNIQUE INDEX "shots_round_day_slot_idx" ON "shots" USING btree ("round_id","day_index","slot");--> statement-breakpoint
CREATE INDEX "shots_round_idx" ON "shots" USING btree ("round_id");