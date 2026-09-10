-- Supprimer un produit libère son code étiquette.
--
-- `fiches_etiquettes.code_etiquette` est unique sur tout le catalogue, archives
-- comprises. Un produit supprimé retenait donc son code pour toujours : le
-- 2026-09-10, ETCNA7372V5 était tenu par l'un des quatre TA7372 supprimés le
-- matin même, et la fiche vivante ne pouvait plus le porter — la Qualité
-- recevait une page d'erreur.
--
-- C'est l'inverse de ce qui avait été décidé pour le code article, dont
-- l'unicité est PARTIELLE : `UNIQUE (code_pf) WHERE archive_le IS NULL`, pour
-- qu'une suppression rende l'identifiant au catalogue. Un index partiel ne peut
-- pas servir ici — `archive_le` vit sur le produit, `code_etiquette` sur la
-- fiche — donc c'est la suppression qui libère, au moment où elle est décidée.
--
-- Le code n'est pas perdu : il passe dans `code_etiquette_libere`, et l'archive
-- reste lisible.

ALTER TABLE "fiches_etiquettes"
  ADD COLUMN IF NOT EXISTS "code_etiquette_libere" varchar(100);

-- Reprise des produits déjà supprimés : ils retiennent des codes sans raison.
UPDATE "fiches_etiquettes" f
SET "code_etiquette_libere" = f."code_etiquette",
    "code_etiquette" = NULL,
    "mis_a_jour_le" = now()
FROM "produits" p
WHERE p."id" = f."produit_id"
  AND p."archive_le" IS NOT NULL
  AND f."code_etiquette" IS NOT NULL;
