CREATE TYPE "public"."agent_ia" AS ENUM('IMPORT_EXTRACTION', 'IMPORT_RECETTE', 'AUDIT_CONFORMITE', 'AUDIT_SEMANTIQUE', 'AUDIT_VISUEL', 'AUDIT_CONTRE_EXAMEN', 'COPILOT_CHAT', 'COPILOT_ESTIMATION', 'RAG_EMBEDDING');--> statement-breakpoint
CREATE TABLE "usage_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent" "agent_ia" NOT NULL,
	"modele" varchar(100) NOT NULL,
	"tokens_entree" integer NOT NULL,
	"tokens_sortie" integer NOT NULL,
	"entite_id" varchar(255),
	"utilisateur_id" uuid,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_ia" ADD CONSTRAINT "usage_ia_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_ia_cree_le_idx" ON "usage_ia" USING btree ("cree_le");--> statement-breakpoint
CREATE INDEX "usage_ia_agent_idx" ON "usage_ia" USING btree ("agent");