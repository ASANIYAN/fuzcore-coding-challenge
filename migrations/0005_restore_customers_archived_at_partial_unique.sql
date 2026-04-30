ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
DROP INDEX IF EXISTS "customers_user_email_unique";
CREATE UNIQUE INDEX "customers_user_email_unique"
ON "customers" USING btree ("user_id","email")
WHERE "customers"."email" is not null and "customers"."archived_at" is null;
