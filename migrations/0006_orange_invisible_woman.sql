DROP INDEX "customers_user_email_unique";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_user_email_unique" ON "customers" USING btree ("user_id","email") WHERE "customers"."email" is not null and "customers"."archived_at" is null;