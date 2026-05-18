CREATE TYPE "public"."role_utilisateur" AS ENUM('ADMIN', 'QUALITE', 'GRAPHISME', 'CONDITIONNEMENT', 'ACHATS', 'DIRECTION');--> statement-breakpoint
CREATE TYPE "public"."statut_controle" AS ENUM('PASS', 'FAIL', 'WARNING', 'PENDING', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."statut_etiquette" AS ENUM('DRAFT', 'QUALITY_REVIEW', 'QUALITY_VALIDATED', 'DESIGN_IN_PROGRESS', 'DESIGN_REVIEW', 'DESIGN_VALIDATED', 'SENT_TO_PRINTER', 'BAT_RECEIVED', 'BAT_VALIDATED', 'PRINTING', 'RECEIVED', 'RECEPTION_CONTROLLED', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."statut_reception" AS ENUM('CONFORME', 'NON_CONFORME_TEXTE', 'NON_CONFORME_COULEUR', 'NON_CONFORME_QUANTITE', 'NON_CONFORME_AUTRE');--> statement-breakpoint
CREATE TYPE "public"."statut_recette" AS ENUM('DRAFT', 'VALIDATED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."type_controle" AS ENUM('DENOMINATION', 'QUID', 'ROUNDING', 'ALLEGATION', 'ALLERGEN', 'REGLISSE', 'LABEL_COHERENCE', 'VISUAL_COHERENCE', 'EAN_CODE', 'INFO_TRI', 'CHAR_SIZE', 'NUTRITIONAL', 'PDF_VS_EXCEL', 'BAT_VS_LABEL');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_entite" varchar(100) NOT NULL,
	"entite_id" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"changements" json,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commandes_impression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_etiquette_id" uuid NOT NULL,
	"code_fournisseur" varchar(100),
	"quantite" integer,
	"prix" real,
	"date_debut_analyse" timestamp,
	"date_fin_analyse" timestamp,
	"date_envoi_externe" timestamp,
	"date_envoi_commande" timestamp,
	"date_envoi_bat" timestamp,
	"date_reception_bat" timestamp,
	"date_validation_bat" timestamp,
	"date_debut_impression" timestamp,
	"date_reception" timestamp,
	"statut_reception" "statut_reception",
	"notes_reception" text,
	"photos_reception_ids" json,
	"controle_par" uuid,
	"controle_le" timestamp,
	"cree_le" timestamp DEFAULT now() NOT NULL,
	"mis_a_jour_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commandes_impression_version_etiquette_id_unique" UNIQUE("version_etiquette_id")
);
--> statement-breakpoint
CREATE TABLE "commentaires_etiquettes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiche_etiquette_id" uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"contenu" text NOT NULL,
	"reference_champ" varchar(255),
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "controles_conformite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiche_etiquette_id" uuid NOT NULL,
	"version_etiquette_id" uuid,
	"type_controle" "type_controle" NOT NULL,
	"statut" "statut_controle" NOT NULL,
	"details" json,
	"suggestion_ia" text,
	"justification" text,
	"controle_par" varchar(255),
	"controle_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiches_etiquettes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produit_id" uuid NOT NULL,
	"code_etiquette" varchar(100),
	"denomination_legale" varchar(255),
	"texte_commercial_fr" text,
	"texte_commercial_en" text,
	"ingredients_fr" text,
	"ingredients_en" text,
	"allergenes" text,
	"allegations_sante_fr" text,
	"allegations_sante_en" text,
	"phrase_wfto_fr" text,
	"mention_conservation" varchar(255) DEFAULT 'À conserver à l''abri de l''humidité de la lumière et de la chaleur',
	"mention_fabricant" varchar(255) DEFAULT 'LES JARDINS DE GAÏA – Z.A. – 6, RUE DE L''ÉCLUSE – FR-67820 WITTISHEIM',
	"sous_designation_de" varchar(255),
	"ingredients_de" text,
	"sous_designation_it" varchar(255),
	"ingredients_it" text,
	"sous_designation_nl" varchar(255),
	"ingredients_nl" text,
	"statut" "statut_etiquette" DEFAULT 'DRAFT' NOT NULL,
	"version_courante_id" uuid,
	"cree_par" uuid,
	"cree_le" timestamp DEFAULT now() NOT NULL,
	"mis_a_jour_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fiches_etiquettes_code_etiquette_unique" UNIQUE("code_etiquette")
);
--> statement-breakpoint
CREATE TABLE "ingredients_recette" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recette_id" uuid NOT NULL,
	"code_article" varchar(50) NOT NULL,
	"designation" varchar(255) NOT NULL,
	"est_demeter" boolean DEFAULT false NOT NULL,
	"est_equitable" boolean DEFAULT false NOT NULL,
	"quantite_kg" real NOT NULL,
	"pourcentage_brut" real NOT NULL,
	"pourcentage_etiquette" real NOT NULL,
	"ordre_tri" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels_produits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produit_id" uuid NOT NULL,
	"type_label" varchar(100) NOT NULL,
	"valeur" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"titre" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"lien" varchar(255),
	"est_lu" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_pf" varchar(50) NOT NULL,
	"gamme" varchar(100) NOT NULL,
	"sous_gamme" varchar(100),
	"denomination_fr" varchar(255) NOT NULL,
	"denomination_en" varchar(255),
	"sous_designation_fr" varchar(255),
	"sous_designation_en" varchar(255),
	"type_the_fr" varchar(255) NOT NULL,
	"type_the_en" varchar(255),
	"origine" varchar(255),
	"producteur_jardin" varchar(255),
	"est_aromatise" boolean DEFAULT false NOT NULL,
	"conditionnement" varchar(100),
	"code_ean" varchar(50),
	"poids_net" varchar(50),
	"temps_infusion" varchar(50),
	"temp_infusion" varchar(50),
	"poids_tasse" varchar(50),
	"nb_tasses" varchar(50),
	"plusieurs_infusions" boolean DEFAULT false NOT NULL,
	"mention_ecocert" varchar(255),
	"nomenclature_pmi" varchar(255),
	"cree_le" timestamp DEFAULT now() NOT NULL,
	"mis_a_jour_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "produits_code_pf_unique" UNIQUE("code_pf")
);
--> statement-breakpoint
CREATE TABLE "recettes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produit_id" uuid NOT NULL,
	"version" varchar(50) NOT NULL,
	"developpeur" varchar(255),
	"date" timestamp,
	"saveur_origine" varchar(255),
	"labels_client" varchar(255),
	"statut" "statut_recette" DEFAULT 'DRAFT' NOT NULL,
	"pourcentage_total" real,
	"fichier_source_id" varchar(255),
	"cree_le" timestamp DEFAULT now() NOT NULL,
	"mis_a_jour_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utilisateurs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"nom" varchar(255) NOT NULL,
	"mot_de_passe" varchar(255) NOT NULL,
	"role" "role_utilisateur" NOT NULL,
	"est_actif" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "utilisateurs_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "versions_etiquettes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiche_etiquette_id" uuid NOT NULL,
	"numero_version" integer NOT NULL,
	"resume_changements" text,
	"donnees_snapshot" json NOT NULL,
	"statut" "statut_etiquette" NOT NULL,
	"pdf_fichier_id" varchar(255),
	"illustrator_fichier_id" varchar(255),
	"bat_fichier_id" varchar(255),
	"cree_par" uuid NOT NULL,
	"valide_par" uuid,
	"valide_le" timestamp,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commandes_impression" ADD CONSTRAINT "commandes_impression_version_etiquette_id_versions_etiquettes_id_fk" FOREIGN KEY ("version_etiquette_id") REFERENCES "public"."versions_etiquettes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes_impression" ADD CONSTRAINT "commandes_impression_controle_par_utilisateurs_id_fk" FOREIGN KEY ("controle_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaires_etiquettes" ADD CONSTRAINT "commentaires_etiquettes_fiche_etiquette_id_fiches_etiquettes_id_fk" FOREIGN KEY ("fiche_etiquette_id") REFERENCES "public"."fiches_etiquettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaires_etiquettes" ADD CONSTRAINT "commentaires_etiquettes_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controles_conformite" ADD CONSTRAINT "controles_conformite_fiche_etiquette_id_fiches_etiquettes_id_fk" FOREIGN KEY ("fiche_etiquette_id") REFERENCES "public"."fiches_etiquettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controles_conformite" ADD CONSTRAINT "controles_conformite_version_etiquette_id_versions_etiquettes_id_fk" FOREIGN KEY ("version_etiquette_id") REFERENCES "public"."versions_etiquettes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiches_etiquettes" ADD CONSTRAINT "fiches_etiquettes_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiches_etiquettes" ADD CONSTRAINT "fiches_etiquettes_cree_par_utilisateurs_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients_recette" ADD CONSTRAINT "ingredients_recette_recette_id_recettes_id_fk" FOREIGN KEY ("recette_id") REFERENCES "public"."recettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels_produits" ADD CONSTRAINT "labels_produits_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recettes" ADD CONSTRAINT "recettes_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions_etiquettes" ADD CONSTRAINT "versions_etiquettes_fiche_etiquette_id_fiches_etiquettes_id_fk" FOREIGN KEY ("fiche_etiquette_id") REFERENCES "public"."fiches_etiquettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions_etiquettes" ADD CONSTRAINT "versions_etiquettes_cree_par_utilisateurs_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions_etiquettes" ADD CONSTRAINT "versions_etiquettes_valide_par_utilisateurs_id_fk" FOREIGN KEY ("valide_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;