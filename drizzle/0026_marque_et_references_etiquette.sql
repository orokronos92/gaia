-- La marque du produit, et les deux références d'étiquette que l'Excel porte.
--
-- Le classeur v2 de la Qualité (2026-09-23) ajoute Terra Madre : 172 épices
-- d'une autre marque, avec d'autres obligations (Ecocert, tableau nutritionnel,
-- pas de WFTO). Sans marque, l'audit leur réclamerait les mentions JDG.
--
-- L'Excel donne aussi, par produit, la référence du facing et celle de la
-- contre-étiquette. La fiche n'avait qu'un `code_etiquette`, vide sur les 189
-- fiches : le contrôle du code imprimé ne pouvait jamais aboutir. Les deux
-- références sont gardées telles quelles ; `code_etiquette` reste celle qu'on
-- attend sur le BAT (la contre dans 78 des 95 cas mesurés le 2026-09-08).
--
-- Voir docs/decisions/2026-09-23-import-bdd-v2-preprod.md.

DO $$ BEGIN
  CREATE TYPE "marque_produit" AS ENUM ('JDG', 'TERRA_MADRE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "produits"
  ADD COLUMN IF NOT EXISTS "marque" "marque_produit" NOT NULL DEFAULT 'JDG';

ALTER TABLE "fiches_etiquettes"
  ADD COLUMN IF NOT EXISTS "ref_facing" varchar(100),
  ADD COLUMN IF NOT EXISTS "ref_contre" varchar(100);
