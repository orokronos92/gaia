-- Le catalogue d'un produit remplace sa « marque ».
--
-- La BDD étiquettes v2 range les produits en quatre onglets, et chacun est un
-- catalogue à part (décision d'Ouro du 2026-09-23) : JDG (thés et infusions,
-- le cœur du cahier des charges et des contrôles), Terra Madre (les épices),
-- Infusettes Pages et Infusettes Country Farm, qui ne sont pas la même chose.
-- La « marque » à deux valeurs (0026, 0029) confondait les infusettes avec JDG.
-- Une gamme appartient à un catalogue : la liste des gammes de JDG ne propose
-- ni poivres ni infusettes.
--
-- 0026 et 0029 n'ont jamais atteint la production ; celle-ci les passera puis
-- celle-ci dans l'ordre, et n'aura que la colonne `catalogue` au bout.

DO $$ BEGIN
  CREATE TYPE "catalogue_produit" AS ENUM ('JDG', 'TERRA_MADRE', 'INFUSETTES_PAGES', 'INFUSETTES_COUNTRY_FARM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "catalogue" "catalogue_produit" NOT NULL DEFAULT 'JDG';
ALTER TABLE "gammes" ADD COLUMN IF NOT EXISTS "catalogue" "catalogue_produit" NOT NULL DEFAULT 'JDG';

-- Reprise de la marque, là où elle existe encore.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produits' AND column_name = 'marque') THEN
    UPDATE "produits" SET "catalogue" = 'TERRA_MADRE' WHERE "marque"::text = 'TERRA_MADRE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gammes' AND column_name = 'marque') THEN
    UPDATE "gammes" SET "catalogue" = 'TERRA_MADRE' WHERE "marque"::text = 'TERRA_MADRE';
  END IF;
END $$;

ALTER TABLE "produits" DROP COLUMN IF EXISTS "marque";
ALTER TABLE "gammes" DROP COLUMN IF EXISTS "marque";
DROP TYPE IF EXISTS "marque_produit";

CREATE INDEX IF NOT EXISTS "produits_catalogue_idx" ON "produits" ("catalogue");
