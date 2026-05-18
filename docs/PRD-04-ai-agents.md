# PRD-04 — Agents IA

## Setup technique

### Client Anthropic

```typescript
// lib/ai/client.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Utiliser claude-sonnet-4-20250514 pour les tâches courantes
// Utiliser claude-opus-4-0-20250414 pour l'audit réglementaire complexe
```

### Principes

- **Streaming** : toutes les réponses IA sont streamées pour l'UX (pas d'attente de 30s sans feedback)
- **Output JSON structuré** : chaque agent retourne un JSON parsable, pas du texte libre
- **Rate limiting** : max 10 appels/min, queue côté serveur
- **Fallback** : si l'API Anthropic est indisponible, les contrôles automatiques (Règles 1-7 du PRD-03) continuent de fonctionner — l'IA est un complément, pas un prérequis
- **Coût estimé** : ~50-100 appels/mois × ~$0.05/appel ≈ $5/mois

---

## Agent 1 — Import & pré-remplissage de fiche

### Déclencheur
Marie uploade une fiche de dégustation (.docx) et/ou une fiche recette (.xlsx) sur l'écran Import.

### Process

```
ÉTAPE 1 — Parsing déterministe (pas d'IA)

  Fiche recette (.xlsx) → openpyxl/SheetJS :
    - Code article, désignation, version
    - Tableau ingrédients : code, nom, qty kg, % brut, % arrondi
    - Labels MP (AB, MH, etc.)
    - Total kg, total %

  Fiche dégustation (.docx) → mammoth/docx :
    - Extraire le texte brut de tout le document
    - Identifier les tableaux Word et leur contenu

ÉTAPE 2 — Extraction IA (Claude)

  Envoyer le texte brut du Word à Claude avec le prompt suivant :
```

### Prompt Agent Import

```
SYSTEM:
Tu es un assistant spécialisé dans l'extraction de données de fiches de dégustation
des Jardins de Gaïa, une entreprise de thé bio et équitable.

Extrais les données suivantes du document et retourne UNIQUEMENT un objet JSON valide,
sans markdown, sans commentaire, sans backticks.

Schéma JSON attendu :
{
  "codeArticle": "string (ex: MT265)",
  "designation": "string (ex: Maté sportif)",
  "typePlante": "string (ex: Mélange de plantes, Thé vert, etc.)",
  "aromatise": boolean,
  "origine": "string ou null",
  "producteur": "string ou null",
  "floId": "string ou null",
  "labelsMP": ["AB", "MH", "WFTO", "Demeter", ...],
  "labelsClient": ["AB", "MH", "WFTO", ...],
  "allergenes": "string (ex: Aucun, ou liste)",
  "allegations": "string ou null (ex: Tonifiant / vitalité)",
  "parametresInfusion": {
    "poids": "string (ex: 2 g)",
    "temperature": "string (ex: 95°C)",
    "duree": "string (ex: 2-3 mn)"
  },
  "ingredientsTexte": "string (la liste d'ingrédients telle que rédigée dans le doc)",
  "gamme": "string ou null (ex: Gamme Bienfaitrice)",
  "conditionnement": "string ou null (ex: sachet 100g, infusettes cristal)",
  "sousDesignation": "string ou null",
  "commentaires": "string ou null (suggestions du comité)",
  "dateMiseMarche": "string ou null"
}

Si un champ n'est pas trouvé dans le document, mettre null.
Les cases cochées dans le document sont marquées par du surlignage [{.mark}] ou [x].

USER:
Voici le contenu de la fiche de dégustation :
{contenu_texte_brut_du_word}
```

### Étape 3 — Fusion & calculs

```
FUSIONNER les données :
  - Recette Excel (ingrédients, qty, %) = source de vérité pour les chiffres
  - Dégustation Word = source pour les métadonnées (type, labels, allégations, gamme)
  - En cas de conflit (ex: % différents) → garder l'Excel, signaler l'écart

CALCULER :
  - Appliquer le moteur d'arrondis (Règle 1 PRD-03)
  - Déterminer la dénomination légale (Règle 2 PRD-03)
  - Identifier les QUID nécessaires (Règle 3 PRD-03)
  - Scanner les allégations (Règle 4 PRD-03)
  - Vérifier la réglisse (Règle 5 PRD-03)
  - Vérifier la cohérence labels (Règle 6 PRD-03)

GÉNÉRER la fiche pré-remplie :
  - Créer un Product + Recipe + LabelSheet en statut DRAFT
  - Formater la liste d'ingrédients réglementaire (ordre décroissant, *, **, %)
  - Pré-rédiger les mentions obligatoires si allégation
  - Retourner un résumé des champs remplis + alertes
```

### Sortie UI
- Résumé : nombre de champs pré-remplis, alertes identifiées
- Lien vers la fiche produit pré-remplie en mode édition
- Marie vérifie, corrige si besoin, puis soumet

### Taux de réussite estimé
- Parsing recette Excel : **95%** (format structuré, quelques variations de colonnes)
- Parsing dégustation Word : **70-85%** (semi-structuré → IA comble les trous)
- Fusion + calculs : **99%** (déterministe)

---

## Agent 2 — Audit réglementaire

### Déclencheur
Bouton [🤖 Lancer audit IA] dans l'onglet Conformité de la fiche produit. Accessible à Marie (QUALITE) et Karrame (DIRECTION).

### Prompt Agent Audit

```
SYSTEM:
Tu es un expert en réglementation de l'étiquetage alimentaire en France et en Europe,
spécialisé dans les thés et infusions. Tu travailles pour Les Jardins de Gaïa.

Tu connais parfaitement :
- Le règlement INCO (UE n°1169/2011)
- Le code de bonnes pratiques STEPI pour les thés et infusions
- Les recommandations DGCCRF sur l'étiquetage bio et aromatisé
- La procédure interne PRO-QHS-013 des Jardins de Gaïa

Voici un résumé des règles clés :
{INSÉRER ICI les règles 1 à 7 du PRD-03 en format condensé}

Analyse la fiche produit ci-dessous et retourne UNIQUEMENT un objet JSON valide.

Schéma JSON attendu :
{
  "denomination": {
    "status": "PASS|FAIL|WARNING",
    "current": "valeur actuelle",
    "suggestion": "correction proposée ou null",
    "explanation": "explication courte"
  },
  "ingredients": {
    "status": "PASS|FAIL|WARNING",
    "issues": [{"field": "...", "issue": "...", "severity": "HIGH|MEDIUM|LOW"}]
  },
  "quid": {
    "status": "PASS|FAIL|WARNING",
    "missingPercents": ["ingrédient1", "ingrédient2"],
    "explanation": "..."
  },
  "allegations": {
    "status": "PASS|FAIL|WARNING",
    "detected": ["Tonifiant", "Vitalité"],
    "mentionsPresentes": {
      "nutritionnelle": boolean,
      "nbTasses": boolean,
      "phraseModeDeVie": boolean
    },
    "explanation": "..."
  },
  "allergens": {
    "status": "PASS|FAIL|WARNING",
    "explanation": "..."
  },
  "reglisse": {
    "status": "PASS|FAIL|SKIP",
    "explanation": "..."
  },
  "labels": {
    "status": "PASS|FAIL|WARNING",
    "issues": [...]
  },
  "globalScore": "CONFORME|NON_CONFORME|A_VERIFIER",
  "summary": "Résumé en 2-3 phrases des points clés",
  "recommendations": ["action 1", "action 2", ...]
}

USER:
Voici la fiche produit complète :

Code : {codePf}
Dénomination FR : {denominationFr}
Sous-désignation FR : {sousDesignationFr}
Type de thé FR : {typeTheFr}
Aromatisé : {aromatise}
Origine : {origine}
Labels : {labels}

Liste d'ingrédients FR :
{ingredientsFr}

Allégations santé FR :
{allegationsSanteFr}

Texte commercial FR :
{texteCommercialFr}

Recette (ingrédients avec %) :
{tableau des ingrédients avec codes, noms, qty, %, arrondis}

Allergènes : {allergenes}
Phrase WFTO : {phraseWftoFr}
Ecocert : {ecocertMention}
Poids net : {poidsNet}
Infusion : {tempsInfusion} min / {tempInfusion}°C
```

### Traitement du résultat

```
1. Parser le JSON retourné
2. Pour chaque section (denomination, ingredients, quid, etc.) :
   - Créer un ConformityCheck avec checkType correspondant
   - Mapper le status (PASS/FAIL/WARNING)
   - Stocker le détail dans le champ `details` (JSON)
   - Stocker la suggestion dans `aiSuggestion`
   - checkedBy = "AI_AUDIT"
3. Afficher les résultats dans le panneau Conformité
```

---

## Agent 3 — Comparaison Excel ↔ PDF

### Déclencheur
Fabrice uploade un PDF d'étiquette sur une fiche en statut `DESIGN_REVIEW`.

### Process

```
ÉTAPE 1 — Extraction texte du PDF
  Option A : pdf-parse (extraction texte structuré) — rapide, gratuit
  Option B : Claude Vision (envoyer l'image du PDF) — plus robuste sur les layouts complexes
  → Utiliser les deux : d'abord pdf-parse, puis si résultat pauvre, fallback sur Vision

ÉTAPE 2 — Comparaison champ par champ
```

### Prompt Agent Comparaison

```
SYSTEM:
Tu compares une fiche étiquette (source de vérité) avec le texte extrait d'un PDF
d'étiquette. Identifie toutes les différences.

Retourne UNIQUEMENT un JSON valide.

Schéma :
{
  "fields": [
    {
      "name": "Dénomination",
      "source": "texte de la fiche",
      "pdf": "texte du PDF",
      "status": "MATCH|DIFF|MISSING_IN_PDF|ADDED_IN_PDF|WARNING",
      "detail": "description de la différence ou null"
    },
    ...
  ],
  "summary": {
    "total": number,
    "match": number,
    "diff": number,
    "missing": number,
    "warnings": number
  }
}

Les champs à comparer (dans cet ordre) :
1. Dénomination de la denrée
2. Sous-désignation
3. Liste d'ingrédients (texte complet, attention aux % et aux symboles * **)
4. Allergènes
5. Allégations santé (mentions complètes)
6. Poids net
7. Paramètres infusion (durée + température)
8. Code EAN
9. Labels et logos (AB, WFTO, Demeter, etc.)
10. Code étiquette
11. Mention fabricant
12. Mention conservation
13. Phrase WFTO
14. Triman / Info-tri (présence)
15. Mention Agriculture [origine]

Sois STRICT sur la comparaison des ingrédients : chaque caractère compte,
un % manquant ou une étoile * oubliée est une erreur.

USER:
=== FICHE ÉTIQUETTE (source de vérité) ===
{toutes les données de la LabelSheet}

=== TEXTE EXTRAIT DU PDF ===
{texte brut extrait du PDF}
```

### Sortie UI
- Vue 3 colonnes (Fiche | Diff | PDF) comme spécifié dans PRD-02 écran 5
- Chaque champ avec statut coloré (✅ ❌ ⚠️)
- Boutons : [Tout valider] → passe en `DESIGN_VALIDATED`, [Demander modification] → commentaire + retour `DESIGN_IN_PROGRESS`
- Résultat enregistré en ConformityCheck type `PDF_VS_EXCEL`

---

## Agent 4 — Comparaison BAT ↔ étiquette reçue

### Déclencheur
Céline uploade une photo de l'étiquette reçue sur une commande en statut `RECEIVED`.

### Process

```
ÉTAPE 1 — Préparer les images
  - Image 1 : PDF du BAT validé (converti en image)
  - Image 2 : Photo uploadée par Céline

ÉTAPE 2 — Analyse par Claude Vision
```

### Prompt Agent BAT

```
SYSTEM:
Tu compares un BAT d'étiquette (référence validée) avec une photo de l'étiquette
physique reçue de l'imprimeur. Identifie toute différence visible.

Concentre-toi sur :
1. TEXTE : est-ce que tout le texte est identique ? (dénomination, ingrédients,
   mentions légales, codes)
2. MISE EN PAGE : positionnement des éléments, alignements
3. LOGOS : présence et placement correct de tous les logos (AB, Eurofeuille,
   WFTO, Demeter, Triman, code-barres)
4. COULEURS : différences notables de teinte (tu ne peux pas être précis sur
   les Pantone, mais tu peux détecter des différences évidentes)
5. DÉFAUTS : bavures, texte coupé, images floues, éléments manquants

⚠️ IMPORTANT : la photo peut avoir des reflets, plis, ou un éclairage imparfait.
Ne signale pas les artefacts de prise de vue comme des défauts d'impression.

Retourne UNIQUEMENT un JSON valide :
{
  "textComparison": {
    "status": "OK|DIFFERENCES_FOUND",
    "issues": [{"element": "...", "description": "...", "severity": "HIGH|MEDIUM|LOW"}]
  },
  "layoutComparison": {
    "status": "OK|DIFFERENCES_FOUND",
    "issues": [...]
  },
  "logosComparison": {
    "status": "OK|DIFFERENCES_FOUND",
    "issues": [...]
  },
  "colorComparison": {
    "status": "OK|NOTABLE_DIFFERENCE|MINOR_DIFFERENCE",
    "notes": "..."
  },
  "defects": {
    "found": boolean,
    "issues": [...]
  },
  "overallVerdict": "CONFORME|NON_CONFORME|A_VERIFIER",
  "summary": "Résumé en 2-3 phrases"
}

USER:
[Image 1 : BAT validé]
[Image 2 : Photo de l'étiquette reçue]

Le produit est : {codePf} — {denominationFr}
L'imprimeur est : {supplierCode}
```

### Sortie UI
- Rapport structuré avec sections (Texte / Mise en page / Logos / Couleurs / Défauts)
- Chaque issue avec sévérité colorée
- Verdict global : CONFORME (vert) / NON CONFORME (rouge) / À VÉRIFIER (orange)
- Boutons : [Accepter] → `RECEPTION_CONTROLLED` + `CONFORME`, [Signaler NC] → choix du type de non-conformité → retour

### Complément colorimétrique (optionnel, Phase 4+)

```
Si Céline prend UNE photo avec BAT imprimé + étiquette côte à côte sur fond blanc :
  1. Découper les 2 zones automatiquement (ou sélection manuelle)
  2. Pour chaque zone de couleur identifiée :
     - Extraire les valeurs RGB moyennes
     - Convertir RGB → CIELAB
     - Calculer Delta E (CIE76 ou CIE2000)
  3. Seuils :
     - ΔE < 3 : imperceptible → ✅
     - ΔE 3-6 : perceptible mais acceptable → ⚠️
     - ΔE > 6 : différence significative → ❌
  4. Afficher : "Vert principal : ΔE = 2.8 ✅" / "Orange logo : ΔE = 8.1 ❌"
```

---

## Récapitulatif des agents

| Agent | Déclencheur | Entrées | Sortie | Modèle | Phase dev |
|-------|-----------|---------|--------|--------|-----------|
| Import | Upload Word+Excel | Fichiers bruts | Fiche pré-remplie | Sonnet | Phase 1 (priorité) |
| Audit réglementaire | Bouton Marie | Toutes données fiche | JSON checks | Sonnet/Opus | Phase 4 |
| Comparaison PDF | Upload PDF Fabrice | Fiche + PDF | Diff champ/champ | Sonnet + Vision | Phase 4 |
| Comparaison BAT | Upload photo Céline | BAT + photo | Rapport visuel | Sonnet Vision | Phase 4 |
