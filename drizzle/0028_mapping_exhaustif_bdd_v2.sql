-- Chaque colonne remplie de la BDD étiquettes v2 a sa place en base.
--
-- Décision d'Ouro du 2026-09-23 : la BDD v2 devient la référence, et rien de ce
-- qu'elle porte ne doit être perdu, même ce que l'application n'utilise pas
-- encore. Carte complète : docs/decisions/2026-09-23-mapping-exhaustif-bdd-v2.md.
--
-- Trois destinations :
-- - des champs typés sur le produit et la fiche ;
-- - une table de suivi de fabrication (l'avancement chez JDG, qui change souvent
--   et ne décrit pas l'étiquette) ;
-- - la ligne Excel brute, gardée intégralement : ce qui n'a pas de champ y reste
--   lisible, et un prochain import aura un état de référence pour se comparer.
--
-- Tout est ajouté, rien n'est supprimé : la migration se rejoue sans effet.

-- ─── Lignes source ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lignes_source" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fichier" varchar(255) NOT NULL,
  "onglet" varchar(100) NOT NULL,
  "numero_ligne" integer NOT NULL,
  "code_pf" varchar(50),
  -- SET NULL : la ligne reste une preuve même si le produit disparaît.
  "produit_id" uuid REFERENCES "produits"("id") ON DELETE SET NULL,
  -- En-tête de colonne → valeur de la cellule, telles que dans le fichier.
  "donnees" jsonb NOT NULL,
  "importe_le" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("fichier", "onglet", "numero_ligne")
);
CREATE INDEX IF NOT EXISTS "lignes_source_code_pf_idx" ON "lignes_source" ("code_pf");
CREATE INDEX IF NOT EXISTS "lignes_source_produit_idx" ON "lignes_source" ("produit_id");

-- ─── Suivi de fabrication ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "suivi_fabrication" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fiche_etiquette_id" uuid NOT NULL UNIQUE REFERENCES "fiches_etiquettes"("id") ON DELETE CASCADE,
  "pret_pour_interne" varchar(120),
  "etiquette_finalisee" boolean,
  "contre_finalisee" boolean,
  "imprimeur" varchar(60),
  "date_envoi_imprimeur" date,
  "pmi_ok_projet_plantes" varchar(30),
  "pmi_f9_texte_commercial" varchar(30),
  "date_modification_pmi_f9" date,
  "sonnentor" varchar(60),
  "premier_lot_v5" varchar(30),
  "biocoop" varchar(30),
  "action" varchar(120),
  "note" varchar(120),
  "commentaires" text,
  "historique" text,
  "gamme_export" varchar(30),
  "priorite_export" varchar(10),
  "switch_pmi" varchar(10),
  "maj_langues_pmi" varchar(10),
  "cree_le" timestamp NOT NULL DEFAULT now(),
  "mis_a_jour_le" timestamp NOT NULL DEFAULT now()
);

-- ─── Produit ───────────────────────────────────────────────────────────────────
ALTER TABLE "produits"
  ADD COLUMN IF NOT EXISTS "origine_en" varchar(255),
  ADD COLUMN IF NOT EXISTS "mention_ecocert_en" varchar(255),
  ADD COLUMN IF NOT EXISTS "poids_net_oz" varchar(20),
  ADD COLUMN IF NOT EXISTS "export_anglais" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "code_pf_export" varchar(50),
  ADD COLUMN IF NOT EXISTS "libelle_pmi" varchar(255),
  -- Colonne « COND. » : Anemos, TRIMAN, TS0200… Sens à confirmer par JDG.
  ADD COLUMN IF NOT EXISTS "cond" varchar(60),
  ADD COLUMN IF NOT EXISTS "priorite" varchar(10),
  ADD COLUMN IF NOT EXISTS "denomination_en_precedente" varchar(255),
  -- Infusettes.
  ADD COLUMN IF NOT EXISTS "quantite_par_boite" varchar(20),
  ADD COLUMN IF NOT EXISTS "poids_unitaire" varchar(20),
  ADD COLUMN IF NOT EXISTS "duree_conservation" varchar(30),
  ADD COLUMN IF NOT EXISTS "code_mp" varchar(50),
  ADD COLUMN IF NOT EXISTS "designation_mp" varchar(255),
  -- Terra Madre : Great Taste, Meilleur Produit Bio…
  ADD COLUMN IF NOT EXISTS "distinctions" varchar(255);

-- ─── Fiche étiquette ───────────────────────────────────────────────────────────
ALTER TABLE "fiches_etiquettes"
  ADD COLUMN IF NOT EXISTS "ancien_texte_commercial_fr" text,
  ADD COLUMN IF NOT EXISTS "ref_facing_precedente" varchar(100),
  ADD COLUMN IF NOT EXISTS "ref_facing_export" varchar(100),
  ADD COLUMN IF NOT EXISTS "ref_contre_export" varchar(100),
  ADD COLUMN IF NOT EXISTS "texte_commercial_court_en" text,
  ADD COLUMN IF NOT EXISTS "phrase_engages_en" text,
  ADD COLUMN IF NOT EXISTS "phrase_wfto_en" text,
  ADD COLUMN IF NOT EXISTS "texte_presentation_en" text,
  ADD COLUMN IF NOT EXISTS "texte_tube_en" text,
  ADD COLUMN IF NOT EXISTS "texte_site_fr" text,
  ADD COLUMN IF NOT EXISTS "ingredients_es" text,
  ADD COLUMN IF NOT EXISTS "ingredients_sv" text,
  -- Infusettes.
  ADD COLUMN IF NOT EXISTS "texte_the_nature_fr" text,
  ADD COLUMN IF NOT EXISTS "texte_eco_emballage_fr" text,
  ADD COLUMN IF NOT EXISTS "texte_manifeste_fr" text,
  ADD COLUMN IF NOT EXISTS "pave_info_tri" boolean,
  ADD COLUMN IF NOT EXISTS "label_fsc" boolean,
  ADD COLUMN IF NOT EXISTS "site_internet" varchar(120),
  ADD COLUMN IF NOT EXISTS "mention_ouverture" varchar(60),
  ADD COLUMN IF NOT EXISTS "mention_ddm" varchar(120),
  ADD COLUMN IF NOT EXISTS "mention_conditionnement" varchar(120),
  -- Terra Madre.
  ADD COLUMN IF NOT EXISTS "tableau_nutritionnel" text,
  ADD COLUMN IF NOT EXISTS "bandeau_facing_haut" varchar(120),
  ADD COLUMN IF NOT EXISTS "bandeau_facing_bas" varchar(120),
  ADD COLUMN IF NOT EXISTS "pave_certification" text;
