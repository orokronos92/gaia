-- Empties the PREPROD catalogue data so it can be rebuilt from the v2 workbook
-- only (Ouro's decision of 2026-09-23: keep everything we built — tables,
-- fields, rules — but no data from before; the workbook is JDG's current base).
--
-- Kept: accounts (utilisateurs), regulatory reference documents
-- (knowledge_documents), and the referentials migrations seed (formats_vente,
-- gabarits_etiquette). Everything else is data and goes.
--
--   psql "$PREPROD_URL" -v ON_ERROR_STOP=1 -f scripts/reinitialiser-donnees-preprod.sql
--
-- Then replay the import: docs/decisions/2026-09-23-mapping-exhaustif-bdd-v2.md.

DO $$
BEGIN
  IF current_database() <> 'gaialabel_preprod' THEN
    RAISE EXCEPTION 'Base « % » refusée : ce script ne vide que gaialabel_preprod.', current_database();
  END IF;
END $$;

BEGIN;
TRUNCATE
  audit_logs, commandes_impression, commentaires_etiquettes, controles_conformite, documents_import,
  fiches_degustation, fiches_etiquettes, fichiers_etiquettes, gammes, sous_gammes, ingredients_recette,
  labels_produits, lignes_source, matieres_premieres, notifications, produits, recettes,
  suivi_fabrication, usage_ia, validations_controle, versions_etiquettes;
COMMIT;
