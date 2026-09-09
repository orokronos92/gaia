# Diagnostic + correction — nom_latin dans le prompt d'extraction

> Branche `gaia_gamma`. Suite des lots 1 (nom_latin → text) et 2 (garde-fou longueur).
> Problème : l'IA écrit la LISTE d'ingrédients latinisée dans `nom_latin` (335 car. sur TH511) au lieu d'un nom latin d'espèce. Ce champ est affiché à Marie.
> **État : correction du prompt appliquée dans le working tree, NON committée, NON rebuildée.**

---

## PHASE 1 — Diagnostic

### 1. Ce qui pousse l'IA à mettre la liste dans `nomLatin`

Dans `buildExtractionPrompt` (`src/agents/imports/importWorker.ts`), le champ était déclaré :

```
"nomLatin": "string ou null",          ← ligne 269, AUCUNE description, AUCUN exemple, AUCUNE règle
```

C'était le seul champ (ou presque) du schéma sans définition sémantique, contrairement à tous ses voisins.

**Déclencheur confirmé par test Mistral réel :** quand le document (FD) présente un **libellé « Nom latin »** contenant la liste latinisée — ce qui arrive pour un mélange, faute d'espèce unique — l'IA le recopie tel quel, sans distinguer mono-ingrédient vs mélange. Reproduit à l'identique : un texte source avec `Nom latin : menthe odorante (Mentha rotundifolia), …` → `nomLatin = 335 car.`, exactement le cas TH511.

### 2. Où doit aller la liste — et doublon ?

`ingredients_suggestion` (colonne `text`) est le bon réceptacle, **et la liste y est déjà présente**. Sur TH511 en base :

| Champ | Longueur | Contenu |
|---|---|---|
| `nom_latin` | 335 | `menthe odorante (Mentha rotundifolia), pétales de souci (Calendula officinalis), …` (avec noms latins) |
| `ingredients_suggestion` | 156 | `menthe odorante, pétales de souci, feuille de framboisier, …` (sans noms latins) |

→ La composition est **déjà dans `ingredients_suggestion`**. Pas besoin de déplacer quoi que ce soit : il suffit que `nomLatin` ne reçoive plus la liste.

### 3. Convention `nom_latin` en base — observée

Sur **169 produits** :

| État de `nom_latin` | Nombre |
|---|---|
| vide / null | **168** |
| court (1–60 car., ~nom d'espèce) | **0** |
| long (60+ car.) | **1 — TH511** (le cas parasite) |

**Observation :** `nom_latin` est vide sur 168/169 produits ; le seul rempli est justement le cas parasite. **Aucun produit mono-ingrédient avec un vrai nom d'espèce n'existe en base** → aucune donnée pour trancher le cas mono. « Mélange → vide » est aligné avec l'écrasante majorité. Je ne tranche pas le cas mono (rien à observer).

---

## PHASE 2 — Correction (nomLatin uniquement)

Deux ajouts au prompt, **aucun autre champ touché** (conditionnement / plusieurs_infusions restent pour un lot séparé).

**Schéma JSON (ligne 269) :**
```diff
- "nomLatin": "string ou null",
+ "nomLatin": "string (nom latin binomial de l'espèce UNIQUE d'un produit mono-ingrédient, ex: 'Ilex paraguariensis', 'Camellia sinensis') ou null si le produit est un mélange de plusieurs plantes",
```

**Règle d'enrichissement (ajoutée) :**
```
- "nomLatin": UNIQUEMENT le nom latin binomial d'UNE espèce quand le produit est
  mono-ingrédient (une seule plante). Pour un MÉLANGE de plusieurs plantes, mettre
  null. NE JAMAIS recopier dans ce champ la liste des ingrédients ni une énumération
  de noms latins entre parenthèses — même si le document présente un champ 'Nom latin'
  contenant une telle liste : cette liste appartient à "ingredientsSuggestion"/"ingredientsTexte".
```

Pas de règle « espèce dominante » pour les mélanges (point métier laissé à l'utilisatrice). Comportement sûr : mélange → `null`.

---

## Vérification (vrai appel Mistral, buildExtractionPrompt corrigé)

Test sur texte représentatif reproduisant le déclencheur (libellé « Nom latin »), avant/après correction :

| Cas | AVANT | APRÈS |
|---|---|---|
| **Mélange (TH511-like)** | `nomLatin` = liste **335 car.** | `nomLatin` = **`null`** ✅ |
| **Mono (maté)** | `nomLatin` = `"Ilex paraguariensis"` | `nomLatin` = **`"Ilex paraguariensis"`** ✅ |

- `ingredients_suggestion` inchangé dans les deux cas (la liste y reste, pas de perte).
- Typecheck `src/` propre.

### Réserves honnêtes

1. La vérification est un **appel Mistral direct** sur un texte représentatif, **pas un réimport via l'app** : le vrai fichier FD de TH511 n'est pas conservé (les sources sont jetées à l'import). Le end-to-end réel se fera dans l'app après rebuild.
2. La correction est **préventive** : le TH511 **déjà en base garde sa valeur parasite** (335 car.) jusqu'à un **réimport**, qui la remettra à `null`.

---

## État git

- `src/agents/imports/importWorker.ts` modifié — **non committé**.
- Lots 1 & 2 committés (`a394800`, `c397b83`) mais **non poussés** sur `origin/gaia_gamma`.
- Prochaine étape (au feu vert) : commit (`fix(import): stop writing the ingredient list into nom_latin`) → rebuild en fin de lot → réimport TH511 dans l'app pour confirmation réelle.
