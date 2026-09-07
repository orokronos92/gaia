CREATE TYPE "public"."type_document_import" AS ENUM('DEGUSTATION_DOCX', 'DEGUSTATION_PDF', 'RECETTE_XLSX');--> statement-breakpoint
CREATE TABLE "documents_import" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produit_id" uuid,
	"fiche_etiquette_id" uuid,
	"cle_s3" varchar(700) NOT NULL,
	"nom_origine" varchar(255) NOT NULL,
	"type" "type_document_import" NOT NULL,
	"taille_octets" integer NOT NULL,
	"importe_par" uuid,
	"importe_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documents_import_cle_s3_unique" UNIQUE("cle_s3")
);
--> statement-breakpoint
ALTER TABLE "documents_import" ADD CONSTRAINT "documents_import_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents_import" ADD CONSTRAINT "documents_import_fiche_etiquette_id_fiches_etiquettes_id_fk" FOREIGN KEY ("fiche_etiquette_id") REFERENCES "public"."fiches_etiquettes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents_import" ADD CONSTRAINT "documents_import_importe_par_utilisateurs_id_fk" FOREIGN KEY ("importe_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_import_produit_idx" ON "documents_import" USING btree ("produit_id");--> statement-breakpoint
CREATE INDEX "documents_import_fiche_idx" ON "documents_import" USING btree ("fiche_etiquette_id");