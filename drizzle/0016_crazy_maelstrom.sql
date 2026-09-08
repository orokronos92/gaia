CREATE TYPE "public"."decision_controle" AS ENUM('VERIFIE', 'DEROGATION');--> statement-breakpoint
CREATE TABLE "validations_controle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiche_etiquette_id" uuid NOT NULL,
	"point_id" varchar(16) NOT NULL,
	"decision" "decision_controle" NOT NULL,
	"justification" text,
	"empreinte" varchar(64) NOT NULL,
	"valide_par_id" uuid NOT NULL,
	"valide_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "validations_controle" ADD CONSTRAINT "validations_controle_fiche_etiquette_id_fiches_etiquettes_id_fk" FOREIGN KEY ("fiche_etiquette_id") REFERENCES "public"."fiches_etiquettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validations_controle" ADD CONSTRAINT "validations_controle_valide_par_id_utilisateurs_id_fk" FOREIGN KEY ("valide_par_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "validations_controle_fiche_point_idx" ON "validations_controle" USING btree ("fiche_etiquette_id","point_id");