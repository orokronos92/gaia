-- La gamme porte ses obligations d'étiquetage.
--
-- L'audit décidait si la mention « transporté à la voile » ou la ligne de don
-- des Engagés était due en cherchant « voile » ou « engag » DANS LE LIBELLÉ de
-- la gamme. Un renommage ou une casse différente éteignait donc un contrôle
-- réglementaire sans le dire, et le seul produit où le contrôle « voile » se
-- déclenchait était celui où quelqu'un avait écrit la mention dans le champ.
--
-- L'obligation devient une propriété de la gamme, que la Qualité coche. Le
-- libellé redevient un simple libellé.

ALTER TABLE "gammes" ADD COLUMN IF NOT EXISTS "exige_mention_anemos" boolean NOT NULL DEFAULT false;
ALTER TABLE "gammes" ADD COLUMN IF NOT EXISTS "exige_mention_engages" boolean NOT NULL DEFAULT false;

-- Amorçage sur ce que la déduction par libellé donnait jusqu'ici : le
-- comportement ne change pas le jour de la migration, il devient seulement
-- corrigeable. Les gammes mal nommées restent à trancher par la Qualité.
UPDATE "gammes" SET "exige_mention_anemos" = true
WHERE lower(translate("nom", 'ÀÂÉÈÊËÎÏÔÖÙÛÜÇ', 'aaeeeeiioouuuc')) LIKE '%voile%';

UPDATE "gammes" SET "exige_mention_engages" = true
WHERE lower(translate("nom", 'ÀÂÉÈÊËÎÏÔÖÙÛÜÇ', 'aaeeeeiioouuuc')) LIKE '%engag%';
