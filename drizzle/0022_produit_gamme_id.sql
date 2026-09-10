-- Le produit désigne sa gamme par un identifiant, plus par son libellé.
--
-- Tant qu'il la désignait par son nom, renommer une gamme détachait ses
-- produits — et une casse différente éteignait un contrôle réglementaire en
-- silence. L'identifiant rend le renommage inoffensif.
--
-- Les colonnes texte restent, tenues à jour comme un reflet : beaucoup
-- d'écrans, d'exports et de contrôles les lisent encore. C'est l'identifiant qui
-- fait foi ; le libellé n'est plus qu'un affichage.

ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "gamme_id" uuid REFERENCES "gammes"("id");
ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "sous_gamme_id" uuid REFERENCES "sous_gammes"("id");

UPDATE "produits" p SET "gamme_id" = g."id"
FROM "gammes" g WHERE btrim(p."gamme") = g."nom" AND p."gamme_id" IS NULL;

UPDATE "produits" p SET "sous_gamme_id" = s."id"
FROM "sous_gammes" s
WHERE s."gamme_id" = p."gamme_id" AND btrim(coalesce(p."sous_gamme", '')) = s."nom"
  AND p."sous_gamme_id" IS NULL;

CREATE INDEX IF NOT EXISTS "produits_gamme_id_idx" ON "produits" ("gamme_id");
