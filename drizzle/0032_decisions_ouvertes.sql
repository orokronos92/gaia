-- Deux décisions de la Qualité qui ne closent pas un point (lot 3, 2026-09-24).
--
-- Face à un écart, Marie avait deux gestes : le lever par dérogation, ou le
-- laisser ouvert sans rien dire. Il lui en manquait deux, qui gardent la ligne
-- ouverte mais disent qui la tient : le BAT est à refaire par le Graphisme, ou
-- une information est attendue de quelqu'un. Ils vivent dans la même table que
-- les autres décisions, avec la même empreinte : si le constat change (nouveau
-- BAT, fiche corrigée), le badge se déclare périmé.

ALTER TYPE "decision_controle" ADD VALUE IF NOT EXISTS 'BAT_A_REFAIRE';
ALTER TYPE "decision_controle" ADD VALUE IF NOT EXISTS 'EN_ATTENTE';
