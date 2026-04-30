DROP INDEX IF EXISTS "categories_user_name_type_unique";
CREATE UNIQUE INDEX "categories_user_name_type_unique"
ON "categories" USING btree ("user_id","name","type")
WHERE "categories"."archived_at" is null;
