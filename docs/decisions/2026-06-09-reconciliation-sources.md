# Réconciliation des sources (dégustation ↔ recette) — décision d'architecture

> Validé par Ouro le 2026-06-09. L'appli est le **référentiel unique** : deux documents
> sources alimentent une fiche, et ils **divergent** (la dégustation est incomplète, la
> recette R&D est complète). Le concept fondamental : **Marie sait TOUJOURS quand il y a
> un différentiel**, elle **valide la vérité sur l'onglet recette**, et cette validation
> **aligne la fiche produit** (issue initialement de la dégustation). Prêt pour audit.

## Contexte — pourquoi

Deux documents arrivent au démarrage d'un produit :
- **Fiche dégustation** (Word, surligné) → alimente la **fiche produit**. Produite par le
  comité de dégustation, qui n'est pas R&D : **il manque souvent des ingrédients** (ex.
  MT265, 2 ingrédients que Marie ne peut pas deviner).
- **Fiche recette** (Excel) → doit alimenter l'**onglet QUID recette**. Produite par le
  service R&D : c'est la **plus complète**, elle comble les trous de la dégustation.

État actuel de l'extraction (constaté le 2026-06-09) :
- L'import **fusionne** les 3 fichiers (Word/Excel/PDF) en **un seul prompt** → **un seul
  JSON plat** → écrit dans `produits` + `fiches_etiquettes` + `fiches_degustation`.
- **Aucune recette structurée** : les kg/% de l'Excel sont aplatis en **texte**
  (`ingredientsTexte`). `ingredients_recette` n'est **jamais** alimenté.
- **Aucune provenance** (qui a dit quoi) → **différentiel impossible**.
- **Pas de ré-import** dans une fiche existante (la route crée toujours une nouvelle
  fiche, et **n'a pas d'`auth()`**).

## Décisions

1. **Deux appels IA ciblés**, pas un blob fusionné.
   - **Word (dégustation) → produit + dégustation** (LLM + RAG dénomination/labels).
   - **Excel (recette) → `ingredients_recette` structuré** (LLM extrait les **kg**).
   - On **reste sur l'extraction IA** (souplesse face aux formats variables ; coût tokens
     négligeable pour un petit tableau). Provenance nette grâce aux deux appels séparés.

2. **kg par l'IA, % par le moteur, validation par Marie.**
   `computeRecette` recalcule **toujours** les % depuis les kg extraits — **aucun chiffre
   halluciné** n'atteint l'audit. Cohérent avec `validerRecetteAction` (déjà en place).

3. **Recharger = écraser.** Pas de fusion « non destructive ». La sécurité ne vient PAS
   de la préservation du travail de Marie, mais de la **visibilité permanente du
   différentiel** : un écrasement ne lui cache jamais rien.

4. **Bouton « Ré-intégrer un document »** près des sauvegardes → ré-import dans une fiche
   **existante** ; relance **seulement** l'appel concerné (dégustation / recette / les
   deux). Ajouter `auth()` sur la route d'import.

5. **Différentiel = composition uniquement.** Ingrédients : présence, kg, %. (Pas les
   labels/origine/etc. — c'est sur la composition que les deux documents divergent.)

6. **Affichage : signal + détail au clic.** Pastille/bandeau permanent sur l'onglet
   recette (« N écarts avec la fiche produit ») → déplie le détail ligne par ligne.

7. **Recette = vérité. Valider aligne le produit.** Marie valide la recette → la
   **composition déclarée du produit** est régénérée depuis la recette validée.

## Le différentiel, concrètement

Côté **produit (dégustation)** il n'y a **pas de kg** — seulement un **texte d'ingrédients**.
Donc le différentiel se calcule en **parsant le texte produit** (`parseIngredientsTexte`,
déjà existant) et en le comparant à la **recette structurée**, **par désignation** :

- ingrédient **présent dans la recette, absent du produit** (les 2 manquants de MT265) ;
- ingrédient **présent des deux côtés mais % différent** ;
- les **kg** ne se comparent pas (seul le côté recette en a).

## Les trois cas (rappel)

- **Cas 1 — dégustation seule.** Produit ← dégustation ; l'onglet recette se pré-remplit
  depuis le texte produit ; Marie se substitue au R&D, complète, valide → aligne le produit.
- **Cas 2 — les deux documents.** Produit ← dégustation ; recette ← Excel R&D (sans tenir
  compte du produit) ; le système **montre les écarts** ; Marie corrige sur la recette,
  valide → aligne le produit.
- **Cas 3 — ré-upload R&D après coup.** Marie avait aligné seule (cas 1) ; R&D envoie SA
  recette ; ré-upload → la recette R&D **écrase** l'onglet recette ; écarts signalés ;
  Marie sait que R&D fait foi → valide → aligne le produit.

Dans **tous** les cas : validation **sur l'onglet recette**, alignement **vers le produit**.

## Garde-fou & sécurité

- QUID : kg (IA) → % (moteur `computeRecette`) → validation (Marie). Jamais les % de l'IA.
- `auth()` obligatoire sur la route d'import (trou actuel).
- Sorties IA **validées Zod** avant tout usage (CLAUDE.md §7).

## Plan en lots

1. **Extraction recette structurée** — second appel IA dédié à l'Excel → tableau
   `[{ designation, quantiteKg, pourcentage?, estDemeter, estEquitable }]`, validé Zod,
   écrit dans `ingredients_recette` (via `src/db/queries/`). L'onglet QUID se remplit
   enfin avec de **vrais kg**.
2. **Découplage des deux appels** — séparer l'appel dégustation (existant) de l'appel
   recette ; provenance conservée ; route import + `auth()`.
3. **Ré-import dans une fiche existante** — bouton « Ré-intégrer », relance l'appel
   concerné, écrase l'onglet cible.
4. **Différentiel composition** — calcul `parseIngredientsTexte(produit)` ↔ recette
   structurée ; pastille « N écarts » + détail au clic sur l'onglet recette.
5. **Alignement produit** — à la validation recette, régénérer la composition déclarée du
   produit/fiche depuis la recette validée.

Chaque lot = un changement logique, testé, sur `gaia_zeta`.

## Hors périmètre (différé — le « boomerang »)

- Différentiel au-delà de la composition (labels, origine…).
- Vue comparée côte à côte plein écran (on reste sur signal + détail au clic).
- Fusion par champ avec provenance fine (on assume l'écrasement + visibilité du diff).
