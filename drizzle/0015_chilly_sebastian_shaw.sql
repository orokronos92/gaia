ALTER TABLE "produits" ADD COLUMN "retire_le" timestamp;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "retire_par" uuid;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "motif_retrait" text;--> statement-breakpoint
ALTER TABLE "produits" ADD CONSTRAINT "produits_retire_par_utilisateurs_id_fk" FOREIGN KEY ("retire_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;