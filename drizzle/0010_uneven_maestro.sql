CREATE TYPE "public"."origine_association" AS ENUM('AUTO', 'MANUEL');--> statement-breakpoint
CREATE TYPE "public"."type_fichier_etiquette" AS ENUM('BAT', 'SOURCE');--> statement-breakpoint
CREATE TABLE "fichiers_etiquettes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produit_id" uuid NOT NULL,
	"cle_s3" varchar(700) NOT NULL,
	"dossier" varchar(255) NOT NULL,
	"nom_fichier" varchar(255) NOT NULL,
	"type" "type_fichier_etiquette" NOT NULL,
	"version" varchar(20),
	"actif" boolean DEFAULT true NOT NULL,
	"origine" "origine_association" DEFAULT 'AUTO' NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL,
	"mis_a_jour_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fichiers_etiquettes_cle_s3_unique" UNIQUE("cle_s3")
);
--> statement-breakpoint
ALTER TABLE "fichiers_etiquettes" ADD CONSTRAINT "fichiers_etiquettes_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fichiers_etiquettes_produit_idx" ON "fichiers_etiquettes" USING btree ("produit_id");