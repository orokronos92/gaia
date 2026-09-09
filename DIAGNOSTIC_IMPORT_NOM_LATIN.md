# Diagnostic — Import à partir d'un seul document échoue (erreur SQL)

> Enquête en lecture seule sur la branche `gaia_gamma`. Aucune modification de code.
> Contexte : le système doit permettre de créer un produit à partir d'UN SEUL document (fiche de dégustation seule OU fiche recette seule). Un import de la FD seule échoue par une erreur SQL.

---

## Cause racine

**Le champ `nom_latin` de la table `produits` est un `varchar(255)`, et l'extraction Mistral y a écrit une valeur de 335 caractères** → PostgreSQL rejette l'INSERT (débordement de longueur, SQLSTATE `22001` « value too long for type character varying(255) »).

Ce n'est **pas** un bug de Drizzle, ni de `onConflictDoUpdate`, ni de la duplication des paramètres, ni du nombre de documents. C'est un **débordement de longueur sur une colonne bornée**, causé par une extraction IA qui met la mauvaise donnée dans le mauvais champ.

---

## Preuve (params réels de la requête échouée)

Extrait des logs applicatifs — le placeholder **`$24` correspond à la colonne `nom_latin`** (`src/db/schema.ts:73` : `varchar("nom_latin", { length: 255 })`) et contient :

```
menthe odorante (Mentha rotundifolia), pétales de souci (Calendula officinalis),
feuille de framboisier (Rubus idaeus), pétales de tournesol (Helianthus annuus),
feuille de noisetier (Corylus avellana), origan (Origanum vulgare),
camomille (Matricaria chamomilla), pétales de bleuet (Centaurea cyanus),
pétales de rose (Rosa damascena)
```

→ **335 caractères** (mesuré), pour une colonne limitée à **255**.

L'IA a mis **toute la liste latinisée des ingrédients** dans `nomLatin` (`p.nomLatin`, assemblé à `src/agents/imports/importWorker.ts:436`), au lieu d'un simple nom d'espèce.

Les autres valeurs longues des params (`commentaires`, `ingredients_suggestion`) tombent sur des colonnes **`text`** (`schema.ts:87,90`) → aucune limite, aucun problème. **`nom_latin` est le seul champ borné qui déborde.**

### Confirmation par comparaison MT265 / TH511

- `MT265.nom_latin = null` (longueur 0) en base → aucun débordement → l'INSERT passe.
- **Donc MT265 ne réussit pas parce qu'il a deux documents, mais parce que son `nom_latin` est vide.**
- TH511 (« Jardin enchanté », infusion Sonnentor multi-plantes) produit une longue liste latine → débordement.

---

## Ce qui est prouvé vs hypothèse

| Élément | Statut |
|---|---|
| `$24 = nom_latin` vaut 335 car. sur une colonne `varchar(255)` | **PROUVÉ** (params + schéma) |
| `produitValues` ne dépend QUE de `p` (extraction FD/PDF), pas de l'Excel recette | **PROUVÉ** (`importWorker.ts:321-323, 413-455`) |
| MT265 passe car `nom_latin` est null, pas grâce à la recette | **PROUVÉ** (base) |
| Le message Postgres exact est `22001 value too long` | **Hypothèse quasi-certaine** — le texte a été perdu au recreate du conteneur, mais c'est la seule cause cohérente : aucun autre param long ne tombe sur une colonne bornée |

---

## Instruction des 5 soupçons initiaux

**1. Assemblage des valeurs produit.** `produitValues` (`importWorker.ts:413-455`) est construit **uniquement depuis `p`** (le JSON extrait de la FD/PDF par Mistral, `:380`). **Il n'y a PAS de fusion FD + recette** : le commentaire `:321-323` l'explicite (« The Excel no longer feeds this produit call »), la recette est traitée séparément et **après** l'insert produit (`:528-540`). `ensureString` (`:387-391`) coalesce les valeurs manquantes en `null`. → aucune fusion deux-sources en jeu.

**2. Construction du SET / décalage d'index — INFIRMÉ.** Le `set: produitValues` (`:472`) re-liste les valeurs, mais le SQL généré est **parfaitement formé** : les colonnes en `default` (`sous_gamme`, `denomination_en`, `cree_le`…) apparaissent comme `default` dans le VALUES et **ne consomment aucun placeholder**. Le compte est exact : 38 pour l'INSERT (`$1-$38`), 37 pour le SET (`$39-$75`), total 75. **Aucun décalage d'index.**

**3. Origine de la duplication des params — présente mais NON coupable.** La duplication vient de `.values(x)` + `.onConflictDoUpdate({ set: produitValues })` avec des **valeurs littérales** (et non `excluded`). C'est le comportement **normal et valide** de Drizzle — exactement celui que MT265 emprunte avec succès. Ce n'est pas la cause de l'échec.

**4. Dépendance au nombre de documents — INFIRMÉ.** L'insert produits (`:465`) est **identique que l'Excel recette soit présent ou non** (il ne lit jamais l'Excel). Corollaire : ré-importer MT265 avec la FD seule passerait aussi, et TH511 avec FD+recette échouerait de la même façon. **Le nombre de documents n'a aucun rôle.**

**5. Différence MT265 / TH511 — CONFIRMÉE comme le vrai axe.** TH511 est une infusion multi-plantes → `nom_latin` de 335 car. MT265 (maté) a un `nom_latin` vide. **La corrélation « FD seule = échec » est fortuite** : TH511 se trouve être à la fois testé en FD-seule *et* être une infusion multi-plantes. Détail confirmant : le `code_pf` extrait était `IMP-1785329827689` (l'IA n'a pas lu « TH511 »), via le fallback `:414`.

---

## Correction proposée (non appliquée)

Le vrai défaut est **sémantique** : `nomLatin` doit porter le nom latin de l'espèce, pas la liste d'ingrédients. Deux niveaux :

1. **Fond (prompt d'extraction)** — cadrer `nomLatin` dans `buildExtractionPrompt` (`importWorker.ts`, autour de `:205-298`) pour qu'il ne reçoive **pas** la liste des ingrédients. Cette liste a déjà sa place dans `ingredientsSuggestion` (colonne `text`). C'est la correction de la racine.

2. **Ceinture (robustesse)** — pour qu'un débordement ne casse plus jamais un import, au choix :
   - passer `nom_latin` en `text` (migration Drizzle additive) — cohérent si une liste latine peut légitimement y figurer ;
   - ou borner les `varchar` à leur longueur avant l'insert (garde-fou générique dans `produitValues`).

**Recommandation : (1) + passage de `nom_latin` en `text`.** Le garde-fou par troncature perdrait de la donnée réglementaire (les noms latins font partie de l'étiquetage), donc il est moins souhaitable comme correction principale.

### Note d'analyse complémentaire

Le fond du problème dépasse `nom_latin` : **tout champ `varchar(N)` de `produits` alimenté par l'extraction IA est exposé au même risque** si l'IA y écrit une valeur trop longue. Les candidats bornés à `255` incluent `origine_mpa`, `type_the_fr`, `sous_designation_fr`, etc. `nom_latin` est le premier à déborder en pratique, mais un garde-fou de longueur (niveau 2) protégerait l'ensemble, en complément de la correction sémantique du prompt (niveau 1).

---

*Fichiers cités : `src/agents/imports/importWorker.ts` (`:321-323`, `:380`, `:387-391`, `:413-455`, `:465-474`, `:528-540`), `src/db/schema.ts` (`:73` nom_latin, `:87` ingredients_suggestion, `:90` commentaires).*
*Diagnostic en lecture seule — aucune modification de code.*
