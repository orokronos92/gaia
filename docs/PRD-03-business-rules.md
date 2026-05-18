# PRD-03 — Règles métier & conformité réglementaire

## Source

Toutes les règles ci-dessous sont tirées de la procédure interne **PRO-QHS-013** (Procédure Vérification d'Étiquetage) des Jardins de Gaïa, elle-même basée sur :
- Règlement (UE) n°1169/2011 (INCO)
- Code de bonnes pratiques d'étiquetage STEPI (oct 2020)
- Recommandations DGCCRF (bio sept 2021, aromatisés nov 2020)
- Guide Infotri CITEO (juil 2022)

---

## Règle 1 — Moteur d'arrondis

### Fichier : `lib/business-rules/rounding.ts`

### Entrée
Tableau d'ingrédients avec `qtyKg` (quantité en kg).

### Algorithme

```
1. Calculer le total en kg : totalKg = Σ qtyKg
2. Pour chaque ingrédient :
   a. Calculer % brut : pctBrut = (qtyKg / totalKg) × 100
   b. Arrondir à 1 décimale :
      - Regarder le 2ème chiffre après la virgule
      - 0 à 4 → arrondi inférieur
      - 5 à 9 → arrondi supérieur
      Exemple : 62.189% → 62.2%, 3.731% → 3.7%, 0.498% → 0.5%
   c. Stocker pctLabel = valeur arrondie

3. Vérifier : Σ pctLabel = 100.0%

4. Si Σ ≠ 100.0% :
   a. Calculer écart = Σ pctLabel - 100.0
   b. Ajuster sur l'ingrédient avec le plus gros pctLabel (le majoritaire)
   c. pctLabel_majoritaire -= écart
   d. Recalculer pour vérifier

5. CAS SPÉCIAUX :
   - Si ingrédient < 0.05% → arrondi à 0.0% → le retirer de la liste ou mentionner "traces"
   - Si plusieurs ingrédients à égalité pour le plus gros → ajuster sur le premier dans l'ordre
   - Ne JAMAIS ajuster sur un ingrédient qui a une allégation ou qui est dans le QUID
```

### Sortie
- `ingredients[]` avec `qtyPercent` (brut) et `qtyPercentLabel` (arrondi)
- `totalPercent` : doit être exactement `100.0`
- `adjustmentApplied` : `{ ingredient: "Maté vert", delta: -0.2 }` ou `null`
- `status` : `PASS` ou `FAIL` (si impossible d'équilibrer)

### Test cases

| Ingrédients (kg) | % brut | % arrondi | Σ | Ajustement |
|---|---|---|---|---|
| Maté 10, Gingembre 2.5, Guarana 1, Hibiscus 1, HE Orange 0.6, Menthe 0.6, Ginseng 0.3, Stevia 0.08 | 62.189, 15.547, 6.219, 6.219, 3.731, 3.731, 1.866, 0.498 | 62.0, 15.5, 6.0, 6.0, 4.0, 4.0, 2.0, 0.5 | 100.0 | Aucun |
| Mauve 3, Mélisse E 1, Mélisse C 2, Achillée 2, Camomille 1.5, Fenouil 0.5 | 30, 10, 20, 20, 15, 5 | 30.0, 10.0, 20.0, 20.0, 15.0, 5.0 | 100.0 | Aucun |

---

## Règle 2 — Dénomination légale

### Fichier : `lib/business-rules/denomination.ts`

### Logique de détermination

```
ENTRÉES :
- typeTheFr (champ produit)
- ingredients[] avec leurs % et noms
- aromatise (boolean)
- présence d'arôme ou HE dans les ingrédients

RÈGLES (dans l'ordre de priorité) :

1. SI présence de Camellia sinensis (thé) ≥ 51% du mélange :
   a. SI aucun arôme/HE/aromate → "Thé [couleur]" (vert, noir, blanc, wulong, sombre)
   b. SI aromatisation par enfleurage (jasmin) → "Thé parfumé au [plante]"
   c. SI aromate X seul (sans arôme) → "Thé à la [aromate]" (ex: "Thé à la menthe")
   d. SI aromate X + arôme naturel de X → "Thé à la [aromate], aromatisé"
   e. SI aromate X + arôme naturel de Y → "Thé aromatisé à la [aromate]"
   f. SI arôme naturel seul → "Thé aromatisé à la [arôme]"
   g. SI extrait ou HE de X → "Thé à la [X]" (ex: "Thé à la bergamote")

2. SI pas de thé OU thé < 50% :
   a. Une seule plante → "Infusion de [plante]" ou nom usuel (ex: "Camomille")
   b. Mélange de plantes sans arôme → "Mélange de plantes à infusion" ou "Tisane"
   c. Mélange de plantes avec arôme → "Infusion aromatisée" ou "Mélange de plantes aromatisé"
   d. Mélange fruits → "Infusion aux fruits"
   e. Mélange plantes + fruits → "Infusion de plantes et de fruits"

3. SI thé entre 1% et 49% dans un mélange :
   → Préciser la présence du thé dans la dénomination si significatif

4. Rooibos → "Rooibos" (dénomination usuelle acceptée)
   Rooibos aromatisé → "Rooibos aromatisé"
   Maté → "Maté" ou "Maté vert"
```

### Sortie
- `denominationProposee` : texte de la dénomination
- `regle` : référence à la règle appliquée (ex: "2c — mélange plantes avec arôme")
- `confidence` : `HIGH` (règle claire) ou `MEDIUM` (cas ambigu, vérification Marie recommandée)

---

## Règle 3 — QUID (Quantitative Ingredient Declaration)

### Fichier : `lib/business-rules/quid.ts`

### Quand un ingrédient doit afficher son % :

```
L'ingrédient DOIT avoir son % dans la liste si :

1. Il figure dans la DÉNOMINATION de la denrée
   Ex: "Thé à la menthe" → menthe doit avoir son %

2. Il figure dans la SOUS-DÉSIGNATION
   Ex: sous-désignation "Digestion" avec gingembre mis en avant → gingembre %

3. Il est mis en avant par une REPRÉSENTATION GRAPHIQUE sur l'étiquette
   Ex: image de citron → citron doit avoir son %
   ⚠️ Ce contrôle ne peut être fait qu'à l'étape de comparaison PDF (Phase 4)

4. Il est essentiel pour CARACTÉRISER la denrée
   Ex: Earl Grey → bergamote est caractéristique
```

### Format du pourcentage

- Résultat du calcul : **1 chiffre après la virgule**
- Règle des arrondis : identique à la Règle 1
- Notation : `menthe poivrée* 12,5%`

### Contrôle automatique

```
Pour chaque ingrédient de la recette :
  - Parser la dénomination FR → extraire les noms de plantes/fruits/arômes
  - Parser la sous-désignation FR → idem
  - Vérifier que chaque nom trouvé a un % dans ingredientsFr
  - Si % manquant → status FAIL + "QUID manquant pour {ingrédient}"
```

---

## Règle 4 — Allégations santé

### Fichier : `lib/business-rules/allegations.ts`

### Détection

```
MOTS-CLÉS D'ALLÉGATION (insensible à la casse, dans tous les champs texte) :
  "détox", "detox", "drainant", "drainante", "purifiant", "purifiante",
  "tonifiant", "tonifiante", "tonique", "stimulant", "stimulante",
  "vitalité", "énergie", "énergisant", "digestif", "digestive",
  "digestion", "relaxant", "relaxante", "sommeil", "apaisant",
  "apaisante", "anti-inflammatoire", "immunité", "minceur"

CHAMPS À SCANNER :
  - sousDesignationFr
  - allegationsSanteFr
  - texteCommercialFr
  - dénomination (si mention directe)
```

### Mentions obligatoires si allégation détectée

```
SI allégation détectée → TOUTES ces mentions sont OBLIGATOIRES :

1. DÉCLARATION NUTRITIONNELLE :
   "Informations nutritionnelles moyennes pour 100 ml :
    Énergie 3 kJ/1 kcal. Cette infusion contient des quantités
    négligeables de matières grasses dont acides gras saturés,
    de glucides dont sucres, de protéines et de sel."

2. NOMBRE DE TASSES + GRAMMAGE :
   "Consommation journalière conseillée : {X} tasses de 25 cl"
   + Si grammage/tasse ≠ 2g → préciser le grammage sur le logo tasse

3. PHRASE RÉGLEMENTAIRE :
   "Il est recommandé d'adopter un mode de vie sain et une alimentation
    variée et équilibrée pour profiter pleinement des vertus de cette infusion."
```

### Contrôle automatique

```
Pour chaque allégation détectée :
  CHECK 1 : allegationsSanteFr contient "Consommation journalière"       → PASS/FAIL
  CHECK 2 : allegationsSanteFr contient "Informations nutritionnelles"   → PASS/FAIL
  CHECK 3 : allegationsSanteFr contient "mode de vie sain"              → PASS/FAIL
  CHECK 4 : l'ingrédient qui porte l'allégation a un % suffisant        → PASS/WARNING

  Si au moins un FAIL → status global FAIL + message descriptif
  Si WARNING → "Vérifier que {ingrédient} à {X}% porte effectivement l'allégation {Y}"
```

### Exemple concret (MT265 Maté Sportif)

- Allégation détectée : "Tonifiant / vitalité"
- Portée par : maté vert (62%)
- Choix possibles :
  - "Tonifiant / vitalité" → 2 tasses/jour
  - "Stimulant et tonique" → 3 tasses/jour
- Vérification : ✅ mentions nutritionnelles, ✅ nb tasses, ✅ phrase réglementaire, ⚠️ seul le maté porte l'allégation (les autres < seuil)

---

## Règle 5 — Réglisse

### Fichier : `lib/business-rules/reglisse.ts`

### Règle

```
SI "réglisse" dans la liste des ingrédients (insensible casse) :
  → OBLIGATOIRE : ajouter la mention
    "Contient de la réglisse – Les personnes souffrant d'hypertension
     doivent éviter toute consommation excessive"

  Aux Jardins de Gaïa : cette mention est utilisée pour TOUS les produits
  contenant de la réglisse, quelle que soit la concentration.
  (Pas de distinction 10mg/l vs 50mg/l — on met toujours la mention complète)
```

### Contrôle

```
SI "réglisse" dans ingredientsFr :
  - Vérifier que la mention hypertension est présente dans l'étiquette
  - Si absente → FAIL
  - Si présente → PASS

SI "réglisse" PAS dans ingredientsFr :
  → SKIP (non applicable)
```

---

## Règle 6 — Cohérence labels

### Fichier : `lib/business-rules/labels-coherence.ts`

### Règles

```
LABEL AB (Agriculture Biologique) :
  - Tous les ingrédients bio → marqués avec * dans la liste
  - Mention "* Issu de l'agriculture biologique"
  - Logo Eurofeuille obligatoire (dimensions min L 13.5mm × H 9mm)
  - Code organisme certificateur : FR-BIO-01
  - Mention Agriculture [origine] sous le code organisme

LABEL DEMETER :
  - Ingrédients Demeter → marqués avec ** dans la liste
  - Mention "** Issu de l'agriculture biologique et biodynamique.
    demeter est la marque des produits issus de l'agriculture
    biodynamique certifiée"
  - Le mot "demeter" en gras italique
  - Si DEMETER présent → AB forcément présent aussi

LABEL WFTO :
  - Phrase obligatoire :
    "Membre certifié World Fair Trade Organization, Les Jardins de Gaïa
     s'engagent pour un commerce plus juste et répondent aux exigences
     du commerce équitable. Pour en savoir plus : www.wfto.com"

LABEL IGP DARJEELING :
  - Vérifier que l'origine contient "Darjeeling"
  - Le thé doit provenir de la région de Darjeeling

MENTIONS BIO POUR L'ORIGINE :
  - "Agriculture [X]" où X = pays si ≥98% d'une origine
  - Sinon "Agriculture UE/non UE"
  - La barre "/" est obligatoire dans "UE/non UE"
```

### Contrôles croisés

```
Pour chaque label du produit (ProductLabel) :
  AB    → vérifier "*" dans ingredientsFr + mention + ecocertMention présent
  DEMETER → vérifier "**" + mention demeter + AB aussi présent
  WFTO  → vérifier phraseWftoFr non vide
  IGP   → vérifier origine contient "Darjeeling"

Pour chaque ingrédient de la recette :
  SI isDemeter = true → vérifier label DEMETER sur le produit
  SI isFairTrade = true → vérifier label WFTO ou MH sur le produit
```

---

## Règle 7 — Informations complémentaires

### Quantité nette — hauteur des chiffres

```
> 1000g    → 6mm minimum
200-1000g  → 4mm minimum
50-200g    → 3mm minimum
≤ 50g      → 2mm minimum
```

⚠️ Contrôle impossible automatiquement (dépend du PDF physique). À vérifier manuellement par Fabrice ou via agent IA en Phase 4.

### Mention fabricant (toujours identique)

```
LES JARDINS DE GAÏA – Z.A. – 6, RUE DE L'ÉCLUSE – FR-67820 WITTISHEIM
www.jardinsdegaia.com
```

### Conservation (standard)

```
"À conserver à l'abri de l'humidité de la lumière et de la chaleur"
```

### Triman & Info-tri

- Triman obligatoire sur l'emballage (min 1cm × 1cm, ou 0.6cm si petit emballage)
- Cartouche Info-tri indissociable du Triman
- Si surface > 40cm² → Triman + Info-tri sur l'emballage
- Si surface 20-40cm² → Triman sur emballage, Info-tri dématérialisable
- Si surface < 20cm² → dématérialisation totale possible (info sur le site web)

### Code EAN (structure Gaïa)

```
35 | 8281 | XX | XXX | X | X
     └── France └── JDG  └─ Famille └─ Article └─ Conditionnement └─ Clé (auto PMI)
```

### E métrologique

```
Non adopté aux Jardins de Gaïa.
```

---

## Panneau de conformité — Résumé des checks

| # | Check | Type | Automatisable | Sévérité si FAIL |
|---|-------|------|--------------|-----------------|
| 1 | Arrondis Σ = 100% | `ROUNDING` | ✅ 100% | FAIL — bloquant |
| 2 | Dénomination légale | `DENOMINATION` | ✅ 85% | WARNING — à vérifier |
| 3 | QUID (% ingrédients affichés) | `QUID` | ✅ 90% | FAIL — bloquant |
| 4 | Allégation santé (mentions) | `ALLEGATION` | ✅ 90% | FAIL — risque DGCCRF |
| 5 | Allergènes | `ALLERGEN` | ✅ 95% | FAIL — bloquant |
| 6 | Réglisse | `REGLISSE` | ✅ 99% | FAIL — bloquant |
| 7 | Labels cohérents | `LABEL_COHERENCE` | ✅ 90% | WARNING |
| 8 | Info-tri / Triman | `INFO_TRI` | ⚠️ Partiel | WARNING |
| 9 | Taille caractères | `CHAR_SIZE` | ❌ Visuel | INFO |
| 10 | Cohérence visuelle | `VISUAL_COHERENCE` | ❌ IA Phase 4 | WARNING |
| 11 | Excel vs PDF | `PDF_VS_EXCEL` | ✅ IA Phase 4 | FAIL — bloquant |
| 12 | BAT vs étiquette | `BAT_VS_LABEL` | ⚠️ IA Phase 4 | WARNING |

**Règle de validation** : Marie ne peut passer au statut `QUALITY_VALIDATED` s'il reste au moins un check en `FAIL`. Les `WARNING` peuvent être justifiés (champ `justification` dans ConformityCheck).
