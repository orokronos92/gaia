# Import de la BDD étiquettes v2 en préproduction

**Date** : 2026-09-23 — **Statut** : spec à valider par Ouro avant tout code
**Source** : `docs/sources/BDD étiquettes 2025 v2.xlsx` (fournie par Marie, non versionnée)
**Cible** : base `gaialabel_preprod` uniquement. La production n'est pas touchée.

## 1. Pourquoi un nouvel import

La base contient 151 produits actifs : c'est tout ce que portait l'extrait de décembre 2025.
Le fichier v2 en porte environ 1 095. L'ancien script (`src/db/seed-real-data.ts`) ne peut
pas servir :

- il vide 11 tables avant d'écrire ;
- il lit le premier onglet, quel qu'il soit ;
- il reconnaît une colonne à un fragment de son nom (« INGRÉDIENTS FR » attrape la première
  colonne qui le contient) ;
- il n'importe ni les labels (AB, WFTO, D…) ni les références d'étiquette.

Ce sont précisément les données dont les contrôles ont besoin : aujourd'hui, **0 fiche sur
189 a un code étiquette**, donc le contrôle du code imprimé sur le BAT ne peut jamais aboutir.

## 2. Ce que contient le fichier

| Onglet | Produits distincts | Rôle |
|---|---:|---|
| JDG | 857 (881 lignes) | catalogue thés et infusions, inclut les 151 existants |
| TERRA MADRE | 172 | épices, **marque distincte** (décision 2026-09-23) |
| INFUSETTES COUNTRY FARM | 45 (48 lignes) | infusettes |
| INFUSETTES PAGES | 22 | infusettes |
| FR et EN | 389 | traductions de produits JDG, complète, ne crée pas |
| CODE ARTI EXPORT | 79 | codes export de produits JDG, complète, ne crée pas |
| FT | — | une fiche technique isolée, ignorée |

## 3. Principes

1. **Colonnes trouvées par leur nom exact**, après normalisation (espaces et retours à la
   ligne réduits, casse ignorée). Une colonne attendue et absente arrête l'import.
2. **Simulation par défaut.** Sans `--appliquer`, le script ne fait qu'écrire le rapport.
3. **Aucune suppression.** Ni produit, ni fiche, ni recette, ni validation.
4. **Une transaction par onglet.** Un onglet qui échoue n'écrit rien.
5. **Idempotent.** Relancer le même fichier ne change rien.
6. **Chaque valeur passe par Zod** avant d'être écrite (CLAUDE.md §8).
7. **Rapport lisible par Marie** : `docs/sources/rapport-import-v2.md`, avec les listes en CSV
   à côté.

## 4. Les 151 produits existants : fusion à trois sources

Marie a pu modifier des fiches dans l'app depuis mars. Écraser par l'Excel détruirait ce
travail ; ignorer l'Excel perdrait ses 33 listes d'ingrédients corrigées. On compare donc
chaque champ entre trois états :

- **ancien Excel** (décembre 2025, `docs/BDD étiquettes 2025 extrait dec 2025.xlsx`) ;
- **base** (préprod, copie de la prod) ;
- **nouvel Excel** (v2).

| Ancien Excel → base | Ancien → nouvel Excel | Décision |
|---|---|---|
| inchangé | inchangé | rien |
| inchangé | changé | **on prend le nouvel Excel** |
| changé (Marie a édité) | inchangé | **on garde la base** |
| changé | changé, même valeur | rien |
| changé | changé, valeurs différentes | **conflit** : on garde la base, listé pour Marie |

Les recettes, les validations de contrôle et les fichiers déjà rattachés ne sont jamais
modifiés par l'import.

## 5. Onglet JDG : correspondance des colonnes

**Produit** : CODE PF → `codePf` · GAMME → `gammeId` (voir §7) · SOUS GAMME → `sousGammeId` ·
DÉNOMINATION FR → `denominationFr` · SOUS-DÉS FR → `sousDesignationFr` · TYPE DE THÉ FR →
`typeTheFr` · ORIGINE DU THÉ → `origine` · POIDS G OU KG →
`poidsNet` · TPS MIN D'INFUSION → `tempsInfusion` · T° C INFUSION → `tempInfusion` ·
POIDS EN G/TASSE DE 25 CL → `poidsTasse` · NBRE DE TASSES → `nbTasses` · CODE EAN →
`codeEan` (« ? » et vide → null, listés) · PLUSIEURS INFUSIONS → `plusieursInfusions` ·
PRODUCTEUR/JARDIN → `producteurJardin` · ECOCERT → `mentionEcocert` · Aromatisé →
`estAromatise` · DENOMINATION EN / SOUS-DÉS EN / TYPE DE THE EN → champs `…En`.

**Fiche** : NOUVEAU TEXTE COMMERCIAL FR → `texteCommercialFr` · NOUVEAU TEXTE COMMERCIAL
COURT POUR ETIQ → `texteCommercialCourtFr` · TEXTE ASSOCIATION LES ENGAGES → `phraseEngagesFr` ·
LISTE D'INGRÉDIENTS FR → `ingredientsFr` · ALLERGENES → `allergenes` · ALLÉGATIONS SANTÉ FR →
`allegationsSanteFr` · PHRASE WFTO FR → `phraseWftoFr` (« / » → statut `NON`, comme la
migration 0018) · NOUVEAU TEXTE COMMERCIAL EN, LISTE INGREDIENTS EN, ALLÉGATIONS SANTÉ EN →
champs `…En` · SOUS DES / LISTE INGREDIENTS DE, IT, NL → champs `…De/It/Nl`.

**Labels** : AB, WFTO, D, WT, IGP, EF → `labelsClient` (valeur « / » ou vide = absent).
AB = « sans résidus de pesticide » (20 produits) n'est **pas** AB : listé pour Marie.

**Références d'étiquette** : REF FACING 2025 et RÉF CONTRE 2025, voir §8.

**Écarts constatés à la première simulation** (2026-09-23) :

- COND. ne contient pas un conditionnement (« Anemos », « TRIMAN », « TS0200 ») : non
  importée, valeurs listées dans les anomalies. `conditionnement` n'est pas touché.
- IGP contient aussi des médailles et « SA » : seul « IGP » devient un label.
- Les codes à 3 chiffres (`MT265`, `TH200`) sont des produits réels sans chiffre de
  conditionnement : acceptés.
- L'ancien seed cochait « plusieurs infusions » pour « / » : la fusion corrige 96 produits.
- « Modifié dans l'app » ne veut pas toujours dire « modifié par Marie » : l'extraction IA
  des fiches descriptives a réécrit certains champs (`TA6122` : « Mélange de plantes » pour
  un thé). La fusion garde l'app ; ces cas sont listés pour relecture.

Colonnes de suivi de production (ACTION, PRÊT POUR AURELIEN, ETIQ FINALISEE, IMPRIMEUR…) :
non importées, ce n'est pas l'objet de la fiche.

Les onglets Terra Madre et Infusettes auront leur propre tableau, écrit au lot 3 une fois
le JDG validé.

## 6. Marque

Nouvelle colonne `produits.marque` (enum `JDG` | `TERRA_MADRE`, défaut `JDG`), migration
0026. Terra Madre porte d'autres obligations (Ecocert, tableau nutritionnel, pas de WFTO) :
l'audit devra lire la marque pour ne pas signaler des mentions JDG absentes à juste titre.
Cette adaptation de l'audit est **hors de cet import**.

## 7. Gammes

Les libellés de l'Excel sont rapprochés des 13 gammes du référentiel sans tenir compte de
la casse ni des accents. Un libellé inconnu **ne crée pas de gamme en silence** : l'import
s'arrête et le rapport liste les libellés à créer ou à rattacher. Même règle pour les
sous-gammes. Les 13 gammes actuelles contiennent déjà des doublons (« Grand classiques » /
« LES GRANDS CLASSIQUES », « LES ENGAGÉS » / « Les Engagés ») : à fusionner par Marie avant.

## 8. Références d'étiquette

L'Excel porte deux références par produit : facing et contre. La fiche n'a qu'un
`codeEtiquette`, vide partout. Proposition : deux colonnes `refFacing` et `refContre` sur
la fiche (migration 0026), et `codeEtiquette` = la référence **imprimée sur le BAT** (voir
question 2). Valeurs « INTERNE », « / », « tube », « Q de tube », vide → null, comptées
dans le rapport.

Ces références servent ensuite au rattachement des PDF du disque de Ouro (`selection.csv`),
au lot 4. Premier croisement (2026-09-23) des 810 références ET de l'onglet JDG avec les
940 PDF retenus :

| Résultat | Références |
|---|---:|
| un PDF porte exactement cette référence | 534 |
| un PDF existe, mais dans une autre version (`ETRM221V6` attendu, `V5` trouvé) | 136 |
| aucun PDF | 140 |

245 PDF retenus ne correspondent à aucune référence de l'Excel : 201 Grands Crus nommés
par code PF (sans code ET), 68 infusettes Country Farm, le reste à examiner. 345 produits
ont « INTERNE » en facing : étiquette imprimée en interne, sans fichier graphiste attendu.

## 9. Mis de côté (listés, jamais importés)

- **les 23 codes JDG et 3 codes Country Farm en double** avec des contenus différents :
  rapport avec les colonnes qui divergent, pour que Marie tranche ;
- les codes hors format (`TJ076A`, `TSTR2092V5`… et la ligne « pétales de fleurs ») ;
- `TM1627`, présent dans JDG et dans Terra Madre.

## 10. Lots

1. **Migration 0026** : `marque`, `refFacing`, `refContre`. Sur la préprod.
2. **Import JDG** : simulation, rapport, relecture avec Ouro, puis `--appliquer`.
3. **Terra Madre et infusettes** : leur correspondance de colonnes, puis même cycle.
4. **Rattachement des PDF** : table REF ↔ `selection.csv`, liste des divergences, puis copie
   des PDF seuls (≈ 2,19 Go) dans `label-assets-preprod`, sur accord de Ouro.
5. **Audit sur tout le catalogue** en lecture seule : ce que chaque contrôle trouve.

## 11. Questions ouvertes

1. **Country Farm et Pages** : ce sont des marques de clients (produits sous leur nom) ou
   des gammes JDG ? Si ce sont des clients, `marque` a deux valeurs de plus.
2. ~~Quelle référence est imprimée sur le BAT~~ — **répondu par la mesure du 2026-09-08**
   (290 BAT) : 95 produits n'impriment qu'un code, celui de la contre-étiquette dans 78 cas.
   `codeEtiquette` = `refContre` quand elle existe, sinon `refFacing`. Les dossiers partagés
   entre conditionnements restent le piège connu.
3. **Terra Madre** : `couverture.csv` liste 171 des 172 codes de l'Excel (manque `TM1627`),
   aucun avec fichier. Le « 128 » annoncé par le tri n'est retrouvé nulle part : à
   redemander. De même, `selection.csv` compte 1 866 fichiers retenus dont 940 PDF
   (2,19 Go), pas 2 109 / 1 100 / 2,56 Go comme annoncé.
4. **Les 18 produits archivés** en base : si un code archivé revient dans l'Excel, on crée
   un nouveau produit actif (l'index partiel le permet) ou on le laisse archivé ?

## 12. Résultats (2026-09-23)

**Lot 2 appliqué sur la préprod** (`scripts/importer-bdd-v2.ts --appliquer --creer-gammes`,
signé Direction dans `audit_logs`) : 681 produits et fiches créés, 141 produits existants
mis à jour, 832 produits actifs (151 avant), 412 fiches avec un code étiquette (0 avant).
Recettes et validations intactes. 4 gammes et 10 sous-gammes créées, à ranger par Marie.
Relancé à vide : aucune écriture. Sauvegarde préalable :
`backups/preprod-avant-import-v2-2026-09-23.dump`.

**Lot 4 simulé** (`scripts/rattacher-etiquettes-v2.ts`) sur les 940 PDF retenus :

| Méthode | PDF |
|---|---:|
| référence exacte de l'Excel | 536 |
| référence de l'Excel, autre version | 130 |
| code produit dans le nom (Grands Crus) | 166 |
| dossier produit | 5 |
| non rattachés (68 infusettes du lot 3, produits mis de côté) | 103 |

431 produits sur 832 ont au moins un BAT. Des 401 autres, 357 n'ont aucune référence ET dans
l'Excel (« INTERNE », « / ») : pas de fichier graphiste attendu. Sur les 475 produits qui en
attendent un, 436 en ont un (92 %) en comptant les BAT de mars.

Les liens sont ajoutés en `origine = AUTO` à côté de ceux de mars. Relancer l'ancien
`scripts/associer-fichiers-etiquettes.ts` les remplacerait par l'heuristique de dossier :
ne pas le relancer sur la préprod.
