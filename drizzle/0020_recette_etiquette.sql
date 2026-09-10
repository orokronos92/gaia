-- La dénomination d'étiquette, distincte de la dénomination R&D.
--
-- Deux documents JDG nomment le même ingrédient : la fiche recette écrit
-- « SORWATHE OP1 » — le nom qui dit au magasinier quel lot peser — et
-- l'étiquette imprime « thé noir », la dénomination légale destinée au
-- consommateur. Aucun des deux n'est faux, et aucun ne peut remplacer l'autre.
--
-- Jusqu'ici la Qualité n'avait nulle part où porter le second : valider une
-- recette proposait d'écraser le texte d'étiquette avec les noms fournisseur,
-- ou de renoncer aux marqueurs Demeter. Cette colonne est la troisième porte.
--
-- null = personne n'a encore relu la ligne ; l'affichage retombe alors sur
-- `designation`, et le contrôle 2.5 le signalera face au BAT.

ALTER TABLE "ingredients_recette"
  ADD COLUMN IF NOT EXISTS "designation_etiquette" varchar(255);
