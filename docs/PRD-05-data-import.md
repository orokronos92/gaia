# PRD-05 — Import des données existantes

## Objectif

Importer les 802 produits de la BDD Excel actuelle (`BDD_étiquettes_2025_extrait_dec_2025.xlsx`) dans PostgreSQL. C'est le script de seed initial. Après cet import, Marie travaille dans GaïaLabel au lieu d'Excel.

---

## Fichier source

- **Nom** : `BDD_étiquettes_2025_extrait_dec_2025.xlsx`
- **Onglet** : `JDG`
- **Lignes** : 802 produits (ligne 1 = headers, lignes 2-803 = données)
- **Colonnes** : 101

---

## Mapping colonnes → modèle Prisma

### Table `Product`

| Colonne Excel | Index | Champ Prisma | Transformation |
|---|---|---|---|
| CODE PF | A (1) | `codePf` | String, trim, **unique** — c'est la clé |
| GAMME | B (2) | `gamme` | String |
| SOUS GAMME | C (3) | `sousGamme` | String, null si vide |
| DÉNOMINATION FR | D (4) | `denominationFr` | String |
| SOUS-DÉS FR | E (5) | `sousDesignationFr` | String, null si "/" |
| TYPE DE THÉ FR | F (6) | `typeTheFr` | String |
| ORIGINE DU THÉ | G (7) | `origine` | String, null si "/" |
| POIDS G OU KG | (chercher par header) | `poidsNet` | String ("100", "36") |
| TPS MIN D'INFUSION | | `tempsInfusion` | String ("4-5", "7-10") |
| T° C INFUSION | | `tempInfusion` | String ("85", "95") |
| POIDS EN G/TASSE DE 25 CL | | `poidsTasse` | String |
| NBRE DE TASSES | | `nbTasses` | String |
| CODE EAN | | `codeEan` | String |
| ECOCERT | | `ecocertMention` | String (ex: "Agriculture UE/non UE") |
| DENOMINATION EN | | `denominationEn` | String, null si vide |
| SOUS-DÉS EN | | `sousDesignationEn` | String, null si "/" |
| TYPE DE THE EN | | `typeTheEn` | String |
| ORIGINE EN | | `origine` (fallback si FR vide) | |
| PRODUCTEUR/JARDIN | | `producteurJardin` | String |
| NOMENCLATURE PMI | | `nomenclaturePmi` | String |
| CONDITIONNEMENT | chercher | `conditionnement` | String |

**Valeur "/" dans Excel** = champ vide → mapper à `null`.

**Détection `aromatise`** : `true` si `typeTheFr` contient "aromatisé" ou "parfumé" (insensible casse).

### Table `ProductLabel`

| Colonne Excel | Label type | Logique |
|---|---|---|
| AB | `AB` | Si non vide et ≠ "/" → créer entrée |
| WFTO | `WFTO` | Idem |
| DEMETER | `DEMETER` | Idem |
| MH (Max Havelaar) | `MH` | Idem |
| WILD TRUST | `WILD_TRUST` | Idem |
| IGP | `IGP` | Idem, stocker la valeur (ex: "Darjeeling") |
| ELEPHANT FRIENDLY | `ELEPHANT_FRIENDLY` | Idem |

### Table `LabelSheet` (1 par produit)

| Colonne Excel | Champ Prisma | Notes |
|---|---|---|
| ANCIEN/NOUVEAU TEXTE COMMERCIAL FR | `texteCommercialFr` | Prendre "NOUVEAU" si non vide, sinon "ANCIEN" |
| NOUVEAU TEXTE COMMERCIAL EN | `texteCommercialEn` | |
| LISTE D'INGRÉDIENTS FR | `ingredientsFr` | Texte complet |
| LISTE INGREDIENTS EN | `ingredientsEn` | |
| ALLERGENES | `allergenes` | |
| ALLÉGATIONS SANTÉ FR | `allegationsSanteFr` | |
| ALLÉGATIONS SANTÉ EN | `allegationsSanteEn` | |
| PHRASE WFTO FR | `phraseWftoFr` | |
| RÉF FACING 2025 | `codeEtiquette` | Ex: "ETMT262V6" |

**Champs multilingues** (si colonnes trouvées dans l'Excel) :
- LISTE INGREDIENTS DE → `ingredientsDe`
- LISTE INGREDIENTS IT → `ingredientsIt`
- LISTE INGREDIENTS NL → `ingredientsNl`

**Statut initial** : `ACTIVE` (les 802 produits sont déjà commercialisés).

### Champs segmentés "1-4" et "2-4"

L'Excel contient des colonnes de segmentation du texte pour le placement physique sur l'étiquette :
- `1-4 Nouveau texte commercial FR`, `2-4 Nouveau texte commercial FR`
- `1-4 Liste d'ingrédients`, etc.
- `1-4 allégation santé FR`, `2-4 allégation santé FR`
- `1-4 Phrase WFTO FR`
- Idem en EN

Ces segments correspondent aux 4 blocs de texte positionnés sur l'étiquette physique. **Les stocker dans un champ JSON `textSegments`** sur LabelSheet :

```json
{
  "commercialFr": ["segment 1-4", "segment 2-4", "segment 3-4", "segment 4-4"],
  "ingredientsFr": ["segment 1-4", "segment 2-4"],
  "allegationsFr": ["segment 1-4", "segment 2-4"],
  "wftoFr": ["segment 1-4"],
  "commercialEn": [...],
  "ingredientsEn": [...],
  "allegationsEn": [...]
}
```

---

## Script d'import

### Fichier : `scripts/import-excel.ts`

```typescript
// Pseudo-code du script d'import

import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

async function importProducts() {
  const workbook = XLSX.readFile('path/to/BDD_étiquettes_2025.xlsx');
  const sheet = workbook.Sheets['JDG'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const headers = rows[0]; // Ligne 1 = en-têtes
  // Construire un map header → index
  const headerMap = {};
  headers.forEach((h, i) => { headerMap[String(h).trim()] = i; });
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const codePf = String(row[headerMap['CODE PF']] || '').trim();
    if (!codePf) continue;
    
    // 1. Créer Product
    // 2. Créer ProductLabel[] (une entrée par label non vide)
    // 3. Créer LabelSheet (statut ACTIVE)
    // 4. Créer LabelVersion initiale (snapshot)
    // 5. Créer AuditLog (action: IMPORT)
  }
}
```

### Gestion des erreurs

- **Doublon codePf** : skip + log warning (ne devrait pas arriver)
- **Champs manquants** : accepter, mettre null, log info
- **Encodage** : UTF-8, attention aux caractères spéciaux (Gaïa avec tréma, °C, ™, etc.)
- **Dry run** : d'abord exécuter en mode lecture seule pour valider le mapping

### Validation post-import

Après l'import, exécuter les vérifications :
- Nombre de produits importés = 802
- Aucun codePf dupliqué
- Tous les produits avec au moins denominationFr non vide
- Comptage des labels par type (ex: 750 AB, 200 WFTO, etc.)
- Comptage des produits avec allégations
- Comptage des produits avec allergènes ≠ "Aucun"

---

## Import des fiches recette

### Format source : `ENR-PRO-023` (ex: `MT165_MATE_SPORTIF.xlsx`)

Ce format est différent de la BDD principale. C'est le fichier que Marie reçoit pour chaque nouvelle recette.

### Structure attendue

```
Row 7  : col A="DATE", col B=date
Row 8  : col A="DEVELOPPEUR", col B=nom
Row 9  : col A="DESIGNATION", col B=nom produit
Row 10 : col A="CODE ARTICLE", col B=code (MT265)
Row 11 : col A="SAVEUR/ORIGINE", col B=texte
Row 12-14 : labels (AB, MH, FFL, WFTO)
Row 15 : VERSION

Row 17 : headers du tableau ingrédients
  col A="CODE ARTICLE", B="DESIGNATION", C="DEMETER", D="COMMERCE EQUITABLE",
  E="QTÉ EN KG", F="QTÉ EN %", G="% pour liste d'ingrédient"

Row 18+ : ingrédients (jusqu'à la ligne "TOTAL")
```

### Mapping → modèle Prisma

```
Recipe :
  productId   ← chercher Product par codePf
  version     ← Row 15 col B
  developer   ← Row 8 col B
  date        ← Row 7 col B
  saveurOrigine ← Row 11 col B

RecipeIngredient (pour chaque ligne 18+) :
  codeArticle    ← col A
  designation    ← col B
  isDemeter      ← col C non vide
  isFairTrade    ← col D non vide
  qtyKg          ← col E (number)
  qtyPercent     ← col F (number, % brut)
  qtyPercentLabel ← col G (number, % arrondi)
  sortOrder      ← index de la ligne (déjà en ordre décroissant dans l'Excel)
```

⚠️ **Variante ENR-PRO-037** (Fiche de suivi essais, ex: `PROJET_PLANTES_2025_THxxx_BONNE_HUMEUR.xlsx`) : structure légèrement différente — pas de colonnes Demeter/Commerce Équitable séparées, colonnes décalées. Le parser doit détecter le format (via le header "ENR-PRO-023" vs "ENR-PRO-037" en haut du fichier) et adapter le mapping.

---

## Import des données imprimeurs

### Source : `TRACABILITE_DELAIS_IMPRIMEURS_QHSE.xlsx`

283 commandes historiques. Import optionnel pour alimenter le module Commandes & Délais (Phase 5).

### Données extraites
- Numéro commande
- Code fournisseur imprimeur
- Dates par étape du workflow
- Délais réels vs cibles

Ces données servent à calculer les stats de respect des délais affichées sur le dashboard (ex: "Marketing 58%").
