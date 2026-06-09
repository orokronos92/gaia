ALTER TABLE "ingredients_recette" ADD COLUMN "est_camellia" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "code_oc" varchar(50);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "contient_reglisse" boolean DEFAULT false NOT NULL;