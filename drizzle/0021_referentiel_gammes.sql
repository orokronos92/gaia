-- Les gammes et sous-gammes deviennent un référentiel.
--
-- `produits.gamme` est une saisie libre, et elle décide de contrôles
-- réglementaires : la mention « transporté à la voile » se déclenche si le
-- libellé contient « voile », celle des Engagés s'il contient « engag ». Une
-- casse différente ou un renommage éteint donc un contrôle en silence.
--
-- Mesuré le 2026-09-10 sur 151 produits : 12 libellés pour environ 7 gammes.
-- Les deux thés Anemos étaient rangés en « Grand classiques » et n'étaient pas
-- contrôlés ; le seul produit où le contrôle se déclenchait portait la mention
-- écrite à la main DANS le champ gamme.
--
-- Une gamme ne se supprime pas — des produits l'ont portée, des paquets sont
-- imprimés. Elle se désactive : elle sort des listes de choix et garde son
-- histoire.

CREATE TABLE IF NOT EXISTS "gammes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nom" varchar(120) NOT NULL UNIQUE,
  "active" boolean NOT NULL DEFAULT true,
  "cree_le" timestamp NOT NULL DEFAULT now(),
  "mis_a_jour_le" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sous_gammes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "gamme_id" uuid NOT NULL REFERENCES "gammes"("id") ON DELETE CASCADE,
  "nom" varchar(120) NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "cree_le" timestamp NOT NULL DEFAULT now(),
  "mis_a_jour_le" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "sous_gammes_gamme_nom_unique" UNIQUE ("gamme_id", "nom")
);

-- Amorçage depuis l'existant : le référentiel doit d'abord dire la vérité du
-- catalogue, y compris ses accidents. C'est la Qualité qui décidera ensuite ce
-- qui fusionne — pas une reprise silencieuse.
INSERT INTO "gammes" ("nom")
SELECT DISTINCT btrim(gamme) FROM produits
WHERE archive_le IS NULL AND btrim(coalesce(gamme, '')) <> ''
ON CONFLICT ("nom") DO NOTHING;

INSERT INTO "sous_gammes" ("gamme_id", "nom")
SELECT DISTINCT g.id, btrim(p.sous_gamme)
FROM produits p JOIN gammes g ON g.nom = btrim(p.gamme)
WHERE p.archive_le IS NULL AND btrim(coalesce(p.sous_gamme, '')) <> ''
ON CONFLICT ON CONSTRAINT "sous_gammes_gamme_nom_unique" DO NOTHING;
