-- Les quatre mentions de gamme deviennent pilotables par la Qualité.
--
-- Jusqu'ici le déclencheur des contrôles était la gamme du produit, en lecture
-- seule : Marie voyait un constat qu'elle ne pouvait pas contredire à la source.
-- Elle pouvait déroger point par point, ce qui referme la ligne et la rouvre au
-- contrôle suivant. Trois positions, et la décision tient.
--
--   AUTO : déduit — gamme voile, gamme Les Engagés, recette Demeter, phrase WFTO
--   OUI  : la Qualité affirme que le produit porte la mention
--   NON  : elle affirme qu'il ne la porte pas → le point passe « sans objet »

CREATE TYPE "statut_mention" AS ENUM ('AUTO', 'OUI', 'NON');

ALTER TABLE "fiches_etiquettes"
  ADD COLUMN "statut_wfto"    "statut_mention" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "statut_demeter" "statut_mention" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "statut_anemos"  "statut_mention" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "statut_engages" "statut_mention" NOT NULL DEFAULT 'AUTO';

-- La convention « / » héritée de l'Excel devient un état lisible.
--
-- 51 fiches portent « / » dans la phrase WFTO pour dire « non concerné » : une
-- convention que rien n'écrit à l'écran et que personne ne devine. Elle se
-- traduit ici une fois pour toutes, et le champ texte est rendu vide.
--
-- Les chaînes vides et les NULL ne sont PAS migrées : elles ne disent pas « non
-- concerné », elles disent « pas encore rempli ». Les confondre déciderait à la
-- place de la Qualité.
UPDATE "fiches_etiquettes"
   SET "statut_wfto" = 'NON', "phrase_wfto_fr" = NULL
 WHERE "phrase_wfto_fr" ~ '^[[:space:]/–—-]+$';
