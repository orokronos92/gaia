CREATE TABLE "fiches_degustation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produit_id" uuid NOT NULL,
	"date_degustation" varchar(50),
	"degustateur" varchar(100),
	"numero_de_lot" varchar(100),
	"moment_degustation" varchar(100),
	"poids_infuse" varchar(50),
	"temperature_degustation" varchar(50),
	"temps_degustation" varchar(50),
	"feuilles_seches_aspect" text,
	"feuilles_seches_couleur" text,
	"feuilles_seches_senteur" text,
	"feuilles_infusees_aspect" text,
	"feuilles_infusees_couleur" text,
	"feuilles_infusees_senteur" text,
	"infusion_aspect_couleur" text,
	"infusion_parfum" text,
	"saveur_bouche" text,
	"fichier_source_nom" varchar(255),
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"content_chunk" text NOT NULL,
	"embedding" vector(1536),
	"metadata" json,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_utilisateur_id_utilisateurs_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DEFAULT 'INFO'::"public"."notification_type";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "title" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "link" varchar(512);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "fournisseur" varchar(255);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "code_article_fournisseur" varchar(100);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "designation_fournisseur" varchar(255);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "flo_id" varchar(100);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "epoque_recolte" varchar(100);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "technique_recolte" varchar(255);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "organisme_certificateur" varchar(100);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "grade" varchar(100);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "volumineux" boolean;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "nom_latin" varchar(255);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "labels_mp" json;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "labels_client" json;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "gamme_conditionnement" varchar(255);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "date_mise_marche" varchar(100);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "commentaires" text;--> statement-breakpoint
ALTER TABLE "fiches_degustation" ADD CONSTRAINT "fiches_degustation_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_utilisateurs_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "utilisateur_id";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "titre";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "lien";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "est_lu";