-- La liste d'ingrédients telle que la BDD étiquettes la donne, dans son propre champ.
--
-- `ingredients_fr` est le champ que remplissent l'extraction des fiches
-- descriptives et la ré-intégration des dégustations : le texte du comité, que
-- l'audit ne contrôle volontairement pas (décision 2026-09-10). La BDD v2, elle,
-- donne la liste imprimée — seule trace pour les recettes anciennes. Les mêler
-- dans un champ rendait leur provenance illisible.
--
-- Cette liste sert de recette étiquette tant qu'aucune recette n'existe ; dès
-- qu'une fiche recette est ré-intégrée, la recette prend le dessus (décision
-- d'Ouro du 2026-09-23). La version anglaise vit déjà dans `ingredients_en`,
-- que seule la BDD remplit.

ALTER TABLE "fiches_etiquettes" ADD COLUMN IF NOT EXISTS "liste_ingredients_bdd_fr" text;
