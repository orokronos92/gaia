ALTER TABLE "produits" DROP CONSTRAINT "produits_code_pf_unique";--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "archive_le" timestamp;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "archive_par" uuid;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "motif_archivage" text;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "ref_archive" varchar(20);--> statement-breakpoint
ALTER TABLE "produits" ADD CONSTRAINT "produits_archive_par_utilisateurs_id_fk" FOREIGN KEY ("archive_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "produits_code_pf_actif_idx" ON "produits" USING btree ("code_pf") WHERE "produits"."archive_le" is null;--> statement-breakpoint
CREATE INDEX "produits_archive_le_idx" ON "produits" USING btree ("archive_le");--> statement-breakpoint
ALTER TABLE "produits" ADD CONSTRAINT "produits_ref_archive_unique" UNIQUE("ref_archive");