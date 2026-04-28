CREATE TYPE "public"."customer_type" AS ENUM('person', 'company');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"company_name" text,
	"type" "customer_type" NOT NULL,
	"email" text,
	"phone" text,
	"tax_id" text,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_user_id_idx" ON "customers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_user_email_unique" ON "customers" USING btree ("user_id","email") WHERE "customers"."email" is not null;