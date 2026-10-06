CREATE TABLE "burn_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"day_index" integer NOT NULL,
	"calories" integer NOT NULL,
	"activity" text,
	"minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hole_days" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"day_index" integer NOT NULL,
	"maintenance" integer NOT NULL,
	"sex" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"day_index" integer NOT NULL,
	"category" text NOT NULL,
	"calories" integer NOT NULL,
	"note" text,
	"minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "tournament" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "tournament_course" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "tournament_location" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "scoring_mode" text DEFAULT 'calories' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "sex" text DEFAULT 'unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "height_cm" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "weight_kg" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "maintenance_override" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "burn_entries" ADD CONSTRAINT "burn_entries_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hole_days" ADD CONSTRAINT "hole_days_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_entries" ADD CONSTRAINT "intake_entries_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "burn_round_day_idx" ON "burn_entries" USING btree ("round_id","day_index");--> statement-breakpoint
CREATE UNIQUE INDEX "hole_days_round_day_idx" ON "hole_days" USING btree ("round_id","day_index");--> statement-breakpoint
CREATE INDEX "hole_days_round_idx" ON "hole_days" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "intake_round_day_idx" ON "intake_entries" USING btree ("round_id","day_index");--> statement-breakpoint
-- Every course that exists at this point was played on the v1 meal ratings.
-- The column default only applies to courses created from here on.
UPDATE "courses" SET "scoring_mode" = 'ratings';
