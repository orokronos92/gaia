-- Traçabilité de l'extraction de recette.
--
-- La fiche recette décide de la liste d'ingrédients, du QUID et des mentions
-- Demeter / commerce équitable. Elle était aplatie en texte puis relue par le
-- modèle, qui devait reconstruire une grille de colonnes que l'aplatissement
-- avait cassée : les trois coches « commerce équitable » de TA602 sont revenues
-- en coches Demeter, soit une revendication de certification sur des matières
-- qui n'en portent aucune.
--
-- Le classeur est désormais lu par adresse de cellule. Ces deux colonnes rendent
-- la lecture vérifiable : par quel chemin la composition est arrivée, et où
-- notre arrondi s'écarte de celui que JDG écrit lui-même.

ALTER TABLE "recettes" ADD COLUMN IF NOT EXISTS "source_extraction" varchar(30);
ALTER TABLE "recettes" ADD COLUMN IF NOT EXISTS "ecarts_pourcentage" json;
