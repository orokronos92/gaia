CREATE TABLE "matieres_premieres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_article" varchar(50) NOT NULL,
	"designation_rd" varchar(255) NOT NULL,
	"denomination_legale" varchar(255),
	"est_bio" boolean DEFAULT true NOT NULL,
	"est_demeter" boolean DEFAULT false NOT NULL,
	"est_equitable" boolean DEFAULT false NOT NULL,
	"qualifie_par" uuid,
	"qualifie_le" timestamp,
	"cree_le" timestamp DEFAULT now() NOT NULL,
	"mis_a_jour_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "matieres_premieres_code_article_unique" UNIQUE("code_article")
);
--> statement-breakpoint
ALTER TABLE "ingredients_recette" ADD COLUMN "est_bio" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "recettes" ADD COLUMN "descriptif_modification" text;--> statement-breakpoint
ALTER TABLE "recettes" ADD COLUMN "raison_modification" text;--> statement-breakpoint
ALTER TABLE "recettes" ADD COLUMN "incidence_etiquetage" boolean;--> statement-breakpoint
ALTER TABLE "matieres_premieres" ADD CONSTRAINT "matieres_premieres_qualifie_par_utilisateurs_id_fk" FOREIGN KEY ("qualifie_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;