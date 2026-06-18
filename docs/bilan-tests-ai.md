# Bilan des tests AI — couverture de l'analyse BAT

> Date : 2026-06-18 · Branche : `gaia_gamma`
> État de couverture de la chaîne d'audit BAT vis-à-vis de la checklist PRO-QHS-013 (13 sections / 35 points).
> Document de travail — à reprendre plus tard pour prioriser les trous.

## Chaîne d'audit BAT (existant)

| Robot | Rôle | Ce qu'il vérifie sur le BAT |
|---|---|---|
| **Texte** (déterministe, `text-robot.ts`) | Comparaison exacte fiche ↔ BAT | Présence de : dénomination · liste ingrédients + % (verbatim) · poids net · code étiquette · mention conservation · adresse fabricant · allergènes déclarés |
| **Sémantique** (LLM, `semantic-robot.ts`) | Équivalence de sens | Allégation (5.2) — formulation reformulée |
| **Visuel** (pixtral, `visual-robot.ts` + `pictos.ts`) | Perception logos (le code juge) | Présence/absence de 5 logos : Eurofeuille (requis) · Triman (requis) · Info-Tri (option) · Point Vert (interdit) · WFTO (option) |

Principe : le LLM ne juge jamais la conformité, le code décide.

## Couverture point par point

### ✅ Réellement couvert sur le BAT
- 5.2 — Allégation (robot sémantique)
- 7.2 — Mention de conservation JDG
- 9.1 — Adresse fabricant
- 15.1 — Code étiquette
- 12.1 — Triman (présence) · 12.2 — Info-Tri (présence) · 13.1 — Eurofeuille (présence) · 13.4 — Point Vert absent

### ⚠️ Partiel — présence vérifiée, pas la règle complète
- **1.0** Dénomination : présence oui, mais caractère « objectif/légal » du libellé **non jugé** (le robot LLM ne fait que l'allégation).
- **2.x / 3.x** Ingrédients + % : texte comparé **verbatim** au BAT, mais l'**ordre décroissant (2.2)**, l'**arrondi (3.2)**, l'**ajustement Σ=100 (3.3)** sont calculés côté **fiche (Voie A)**, pas re-vérifiés depuis la mise en page du BAT.
- **5.1** Allergènes : présence oui, **mise en évidence (gras/souligné) non vérifiée**.
- **6.1** Poids net : présence oui, **hauteur des chiffres (6.2) non mesurée**.
- **13.3** Labels non officiels : seul **WFTO** est détecté ; Fairtrade, Fair for Life, Elephant Friendly, théiers sauvages et la **justification par la matière** ne le sont pas.

### ❌ Pas couvert par l'analyse BAT
- **1.2** Aromatisé · **1.3** Parfumé · **4.1-4.2** Nutrition · **7.1** Mode d'emploi → contrôles **LLM textuels non câblés** dans la chaîne BAT (seule l'allégation l'est).
- **1.4** Dénomination dans le même champ visuel que le poids net (placement).
- **2.1** Mot « ingrédients » en préfixe · **2.4** Légende étoiles bio/demeter.
- **5.3** Réglisse (gap data + pas BAT).
- **8.1 / 8.2 / 8.3** Origine (placement + champs manquants).
- **10.1** Structure gencode EAN (était vision-eligible, mais le `BatVisionAgent` a été supprimé).
- **11.1** Absence du « e » métrologique.
- **13.2** Code OC **FR-BIO-01** (pas dans les entrées du robot texte).
- **14.1** Hauteur de x typographique — *contrôle critique des BAT* — **non automatisé** (mesure en mm reportée post-démo, nécessite `pdfjs-dist`).
- Toutes les **dimensions** : Triman ≥ 1 cm, Eurofeuille ≥ 13,5 × 9 mm, complétude du cartouche Info-Tri → on a la **présence**, jamais la **taille**.

## Les 3 trous structurants

1. **Les contrôles LLM textuels ne sont pas branchés sur le BAT.** La Voie B (dénomination / aromatisé / nutrition / mode d'emploi) n'existe que sur la fiche, pas en relecture du BAT. Seule l'allégation a son robot sémantique.
2. **Aucune mesure dimensionnelle.** Tout ce qui est hauteur de caractère (14.1, 6.2) et taille de logo est hors champ aujourd'hui (reporté, besoin de `pdfjs-dist`). C'est le plus gros manque réglementaire.
3. **Plusieurs données « imprimées-sur-BAT » non lues.** Code OC FR-BIO-01 (13.2), gencode (10.1), « e » (11.1), placement / champ visuel (1.4, 8.1) : depuis le retrait du `BatVisionAgent`, plus rien ne les lit sur l'artwork.

## Synthèse

La chaîne BAT couvre bien le **socle présence-texte + allégation + 5 logos** — l'essentiel des points « binaires de présence ». Mais **~la moitié de la checklist reste non vérifiée sur le BAT**, surtout :
- les **mesures dimensionnelles** (dont la hauteur de x, critique) ;
- les **interprétations textuelles LLM** non câblées.

Rien de cassé : ce sont les chantiers explicitement notés comme *pending* (mesures police post-démo, raffinage pictos). À prioriser lors d'une prochaine itération.
