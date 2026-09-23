-- Une gamme appartient à une marque.
--
-- Terra Madre arrive avec ses propres gammes (MY FRENCH RUBS, LES POIVRES,
-- ÉPICES…) ; décision d'Ouro du 2026-09-23 : elles sont rattachées à leur
-- marque, pour qu'une liste de gammes JDG ne propose pas de poivres. Les gammes
-- existantes sont toutes JDG.

ALTER TABLE "gammes"
  ADD COLUMN IF NOT EXISTS "marque" "marque_produit" NOT NULL DEFAULT 'JDG';
