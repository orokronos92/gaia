-- La Qualité doit pouvoir assumer un constat hors checklist.
--
-- `validations_controle.point_id` accueillait un identifiant de registre —
-- « 3.2 », « 13.6 » — donc seize caractères suffisaient. Les constats relevés
-- sur le BAT sans point pour les porter s'identifient autrement :
-- « MENT_COHERENCE_ETIQUETTE », « TYPO_ALLERGENE_EVIDENCE ». Ils ne rentraient
-- pas, et Marie n'avait donc aucun moyen de sortir une anomalie hors checklist
-- de sa liste de travail — même après l'avoir regardée et tranchée.

ALTER TABLE "validations_controle" ALTER COLUMN "point_id" TYPE varchar(64);
