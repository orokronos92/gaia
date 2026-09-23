# Constat : les conditionnements de JDG

**Date** : 2026-09-23 — **Statut** : constat, aucune règle appliquée
**Sources** : `BDD étiquettes 2025 v2.xlsx` (tous les onglets) et les 1 100 PDF du tri
(zone de coupe lue avec `pdfinfo -box`). Aucune hypothèse de Marie ou du graphiste :
uniquement ce que les données montrent.

Objectif : la liste exhaustive des conditionnements avant de poser une règle, pour que
GaïaLabel porte seul cette connaissance une fois l'Excel abandonné.

## 1. Trois axes indépendants

Le mot « conditionnement » recouvre trois choses que l'Excel mélange :

| Axe | Ce qu'il dit | Où on le lit |
|---|---|---|
| **Format de vente** | vrac 1,5 kg, sachet détail, 500 g… | 4ᵉ chiffre du code PF, préfixe (`TU`, `IF`…) |
| **Gabarit d'étiquette** | la taille physique imprimée | zone de coupe du PDF |
| **Emballage** | le sachet, le tube, la boîte | colonnes « CONDITIONNEMENT EXPORT », « PACK. », quantité d'infusettes |

Le poids n'est sur aucun de ces axes : il dépend de la densité du thé. 70 g existe en
chiffre 2 (`TH0612` Bonne mine, `TA9012` Premiers flocons, `TO2012`) comme en chiffre 6
(`TB4016` White Monkey, `TN2396` Rungbang, `TA9036`). Un sachet « 100 g » contient
60 à 100 g, un sachet « 50 g » 15 à 80 g.

## 2. Format de vente : le 4ᵉ chiffre (onglet JDG)

| Chiffre | Lecture | Poids observés (nb de produits) | Facing dans l'Excel |
|---|---|---|---|
| 1 | vrac grand format | 1,5 kg (216) ; 500 g (13) ; plantes : 100 à 750 g (20) ; `?` (13) ; `TJ9051` 30 g | INTERNE 255/263 |
| 2 | sachet détail « 100 g » | 100 (256), 80 (35), 90 (9), 70 (5), 60 (5), « 80 → 50/30/35 » (7), 120, 150, 250, 12, « 3 pièces » | fichier graphiste 306/322 |
| 6 | sachet détail « 50 g » | 50 (84), 40 (11), 60 (8), 70 (8), 25 (5), 30 (4), 20, 15, 10, 80 | fichier graphiste 101/126 |
| 5 | vrac 500 g | 500 (43), 400 (13) ; exceptions 50 g (6), 56 g, 125 g | INTERNE 47/64 |
| 7 | vrac 1 kg | 1 kg (38) ; exceptions `TR2407` 1,5 kg, `TM1627` 35 g | INTERNE 39/40 |
| 4 | boîte / grand sachet | KEIKO 50 g (10, sans référence), Lapacho et Maté 250 g, `TJ9204` 200 g | variable |
| 3 | exception | `COF1203` brique, `TO1143` échantillon 7 g | — |
| aucun | code à 3 chiffres | Bienfaitrices `TH5xx` 30 à 200 g (33), quelques Grands Crus (`TB715`, `TN305`) | fichier graphiste |

Exceptions où le chiffre **n'est pas un format** : `COF1201/1202/1203` (Joie, Amour,
Harmonie : trois briques différentes de 100 g).

Préfixes qui disent l'emballage : `TU…` et `TUT…` = tube (68 codes), `COF` = brique,
`IF` = infusettes. Lectures probables, à confirmer : `TSTA`/`TSTR` = version Noël
(Neige au soleil, Lumière d'étoiles, Surprise de Noël), `TUO` = galette (Galette Pu'er),
`BT` = vente à la pièce (Pétales d'argent 12 g, « 3 pièces »).

## 3. Gabarit d'étiquette : la taille réelle (zone de coupe)

787 PDF ont une zone de coupe ; 313 n'en ont pas (planches, stickers : voir plus bas).

| Gabarit (mm) | PDF | Face | Qui l'utilise |
|---|---:|---|---|
| **55 × 135** | 261 | facing | sachet standard : Grands Classiques, Engagés, Noël, Voile — **chiffres 2 et 6 identiques** |
| **55 × 95** | 294 | contre | idem |
| **70 × 120** | 54 | facing | sachet plantes : Bienfaitrices (`TH`) et quelques Grands Classiques |
| **70 × 100** | 53 | contre | idem |
| **70 × 165** | 13 | facing + contre | sachet « Volumineux » (le nom du fichier le dit) : `TB4042` Ché Chun 100 g, `TB4032`, `TM0202` |
| **145 × 199** | 13 | habillage tube | tube chiffre 2 |
| **64 × 199** | 17 (+24) | habillage tube / bande | tube chiffre 6, Précieux |
| **47 × 64**, **64 × 64** | 11 (+119) | sticker | Grands Crus (sans zone de coupe) |
| **20 × 56** | 22 | étiquette de sachet | infusettes |
| **100 × 240** | 24 | étui | infusettes |
| **297 × 420** (A3), **451 × 452** | 18 (+161) | planche / étui déplié | infusettes, Grands Crus |
| 33 × 195, 19 × 188, 70 × 277, 210 × 297 | 7 | bandes, cas isolés | à qualifier |

**Constat majeur** : le 100 g et le 50 g d'un même thé ont le **même gabarit**. Seul le
contenu de la contre change (poids net, EAN, nombre de tasses). Le chiffre fixe donc le
contenu attendu, pas la taille de l'étiquette.

## 4. Emballage

- **Sachets** : « Sachet format GC SA9205 » (65 produits : tous en 55 × 135 / 55 × 95) et
  « Sachet format volumineux » (9 produits : Bienfaitrices, en 70 × 120 / 70 × 100).
  Attention : le « volumineux » de cette colonne n'est **pas** le « _Volumineux » des noms
  de fichiers (70 × 165). Deux choses différentes portent le même mot.
- **Tube** : `TU0001` (16 produits).
- **Infusettes** : boîte de 15 (`IF4xx`, 30 g), de 50 (`IF5xx`, 100 g), de 20 (`IF1xx`
  Pages, 30 à 36 g). Une exception : un `IF5xx` noté 15 infusettes.
- **Terra Madre** : codes d'emballage `EMB0001` à `EMB0033`, `SA9226`, un pot en verre ;
  poids de 10 à 150 g. Aucun fichier d'étiquette dans le tri.

## 5. Ce que le constat change pour les règles

1. **Un BAT se rattache par sa référence**, et une contre porte le chiffre de son format
   dans 313 cas sur 316 : elle ne va qu'à ce format.
2. **Un facing sans chiffre est légitimement partagé** entre le 100 g et le 50 g, puisque
   le gabarit est le même.
3. **Les presets de contrôle se définissent par gabarit**, pas par chiffre ni par poids.
   Le gabarit se lit dans le PDF lui-même : c'est une mesure, pas une déclaration.
4. **Un produit vrac (1, 5, 7) marqué INTERNE** n'attend aucun fichier graphiste.

## 6. À confirmer au retour de Marie (non bloquant)

- Chiffre 4 : boîte (KEIKO) et sachet 250 g sous le même chiffre ?
- Colonne poids « 80 → 50 », « 80 → 30 », « 80 → 35 » (7 produits) : changement de format ?
- 13 vracs plantes au poids `?`, `TJ5x95` Shincha 50 g en chiffre 5, `TO1145` 56 g en 5.
- Les 313 PDF sans zone de coupe (planches A3 d'infusettes, stickers Grands Crus) : quel
  PDF est l'étiquette de référence ?
