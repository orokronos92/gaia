# Diagnostic des retours de Marie — tri existant / manquant

> Diagnostic en lecture seule sur la branche `gaia_gamma` (code actuellement déployé, commit `c09a7ad`).
> Aucune modification de code effectuée. Objectif : trier les vraies lacunes des fonctions mal exposées, pour réduire le temps que Marie passe à corriger à la main.
>
> Légende des verdicts :
> - **(a)** la fonction n'existe pas — vraie lacune
> - **(b)** la fonction existe mais ne s'affiche pas / est enterrée derrière un clic, un onglet ou un mode édition — problème d'UI ou de découvrabilité
> - **(c)** la fonction existe et marche, mais Marie ne l'a pas trouvée — problème d'ergonomie ou de libellé

---

## Tri en une phrase

La plupart des retours « absent / bloquant » de Marie **ne sont pas des lacunes de code** : ce sont des données déjà présentes qu'on n'affiche pas, ou des fonctions rangées dans le mauvais onglet. Le vrai trou fonctionnel, lui, est concentré sur **un seul sujet** : la génération de la liste d'ingrédients INCO. C'est là qu'elle « corrige tout à la main ».

---

## Tableau de synthèse

| Groupe | Sujet | Verdict | Fichier(s) clé | Effort |
|---|---|---|---|---|
| **A** | Logos AB/MH/WFTO/Demeter | **b** (modélisés, jamais peuplés) | `schema.ts:82-83`, `seed-real-data.ts` | moyen |
| **A** | Logo Anemos | **a** (non modélisé) | — | faible |
| **A** | Ecocert | **c** (marche de bout en bout) | `schema.ts:59`, `EtiquetteClient:506` | nul |
| **B** | Code EAN | **b** (en base, non affiché) | `page.tsx:19-80`, `audit.ts:58` | faible |
| **B** | Codes étiquette facing/contre/sachet | **a** (1 seule colonne générique) | `schema.ts:163` | élevé |
| **C** | Mention réglisse | **b/a** (flag jamais peuplé ni affiché) | `schema.ts:80`, `audit.ts:56` | faible |
| **C** | Mention Demeter / Les Engagés | **a** (non modélisées comme mentions BDD) | — | moyen |
| **D** | Liste d'ingrédients INCO | **a** (9 règles/11 absentes) | `lib/recette/liste-ingredients.ts` | **élevé** |
| **E** | Extraction conditionnement / plusieurs infusions | **b** (extrait mais faux — prompt) | `importWorker.ts:205-298` | faible |
| **F** | Type de thé / origine tronqués | **b** (CSS `truncate`) | `EtiquetteClient.tsx:105,500-501` | faible |
| **F** | Allergène / allégation visibles en édition seule | **b** (gated `hasRealValue`) | `EtiquetteClient.tsx:59-63,611,622` | faible |
| **F** | Pitch tronqué | **non reproduit** | `EtiquetteClient.tsx:812-819` | à confirmer |
| **G** | « sous-dénomination » → « sous-désignation » | **c** (libellé) | `EtiquetteClient.tsx:126` | trivial |
| **G** | « certif et labels » à remonter | **b** (existe, enterré en bas) | `DossierComplementaire.tsx:189` | faible |
| **H** | Audit IA ne remonte rien | **b** (mauvais onglet + exige BAT) + **a** (couverture) | `EtiquetteClient.tsx:947-957`, `audit-visuel.ts:50` | moyen/élevé |
| **I** | codePf plus gros | **c** | `EtiquetteClient.tsx:391` | trivial |
| **I** | Triman | **a** (absent de la fiche) | `control-checklist.ts:184` (audit only) | faible |
| **I** | Volumineux | **b** (existe, enterré dans « PMI ») | `EtiquetteClient.tsx:527,547` | faible |
| **I** | Grille organoleptique | existe — « pas besoin » → à replier | `EtiquetteClient.tsx:685` | trivial |
| **Q6** | Re-visualiser FD + recette | **a** (fichiers jetés à l'import) | `importWorker.ts:523`, `schema.ts:140` | moyen |

---

## Détail par groupe

### A / B / C — le mapping BDD

Point structurel majeur : **il n'existe aucune table `BDD_étiquettes`**. L'Excel est chargé par le script one-shot `seed-real-data.ts` (jamais par l'import DOCX de Marie). Trois familles de rupture distinctes, pas une cause unique :

- **Requête / UI** (le moins cher) : `code EAN` et `réglisse` sont **déjà en base** (l'audit les lit, `audit.ts:56,58`) mais absents du `select` de `page.tsx` et jamais rendus. Copier le pattern de la mention WFTO (`EtiquetteClient:824`) suffit.
- **Peuplement** : logos AB/MH/WFTO/Demeter sont modélisés (tokens JSON `labelsMP`/`labelsClient`), requêtés et rendus **en badges texte** — mais le seed ne les mappe jamais → tableaux vides. À noter : ces logos viennent de la BDD étiquettes, que le flux d'import de Marie (FD + recette) ne lit pas.
- **Schéma** (le plus cher) : `Anemos`, `Les Engagés`, `mention Demeter`, et les 3 variantes de code étiquette (facing / contre / sachet, aujourd'hui écrasées dans l'unique `codeEtiquette:163`) ne sont pas modélisés du tout.

La table `labels_produits` (`schema.ts:123-128`) existe mais est **morte** : jamais insérée, jamais lue. La mention WFTO (`phraseWftoFr`) est le seul champ « logo/mention » intact de bout en bout — il sert de modèle de référence : schéma `174` → seed `102` → requête `page.tsx:52` → UI `EtiquetteClient.tsx:824-832`.

### D — liste d'ingrédients : le vrai trou

Le générateur (`liste-ingredients.ts`, 42 l.) est une **concaténation naïve**. L'« Agent de Recette » LLM (`RecetteAgent.ts`) ne fait que reformuler et n'applique aucune règle non plus.

| Règle (Marie) | Verdict | Fichier:ligne | Note |
|---|---|---|---|
| Préfixe « Ingrédients : » | **ABSENTE** | `liste-ingredients.ts:41` | Sortie = `join(", ") + "."`. Préfixe seulement *retiré* en entrée (`parse-ingredients.ts:22-23`) |
| Majuscule 1er, reste minuscule | **ABSENTE** | `liste-ingredients.ts:28-42` | Aucune transformation de casse |
| Astérisque `*` bio + mention « *Issu de l'agriculture biologique. » | **ABSENTE** | `liste-ingredients.ts:36` | Marqueurs `✱` (Demeter) et `°` (équitable), pas `*` bio. Flag `estDemeter`, pas `estBio`. Aucune légende finale |
| Arômes → « arôme naturel de xxx » + regroupement | **ABSENTE** | — | Aucune logique arôme dans le pipeline recette |
| Masquage nom du thé → « thé noir/vert » + compilation quantités | **ABSENTE** | `denomination.ts:21-26` | La compilation des % de thé existe seulement pour la dénomination légale produit, jamais dans la liste |
| « pétales de fleurs » sans l'espèce | **ABSENTE** | — | Règle inexistante |
| Noms latins en italique | **ABSENTE** | `liste-ingredients.ts:41` | Le générateur renvoie une string brute |
| Dénominations ERP (libellés légaux) et non texte brut | **ABSENTE** | `parse-ingredients.ts:6-9`, `useCalculatrice.ts:317` | Désignations issues du texte extrait ou saisi. Aucune table `articles`, aucun lookup `codeArticle` |
| N'afficher que les % de la sous-désignation (et allégations) | **ABSENTE** | `liste-ingredients.ts:39` | Un % imprimé pour chaque ligne non masquée |
| Recette à 1 ingrédient → juste l'ingrédient | **PARTIELLE** | `liste-ingredients.ts:41` | Sort « thé vert 100 %. » — pas de cas spécial nom seul |
| Flag `masquerPourcentageEtiquette` | **IMPLÉMENTÉE** | `schema.ts:156`, `useCalculatrice.ts:331`, `liste-ingredients.ts:26,32,37-39` | Seule règle réellement câblée (secret industriel) |

Racine confirmée : **les désignations viennent du texte brut** (recette parsée ou saisie), jamais d'un référentiel légal — il n'existe aucune table `articles`. Piège à éviter : le code marque `estDemeter` (`✱`), pas `estBio` (`*`) — deux notions différentes ; la règle de Marie porte sur le bio.

### E — extraction

Les deux champs sont extraits par **prompt LLM** (`buildExtractionPrompt`, `importWorker.ts:205-298`), pas par mapping colonne ni regex. `recetteExtractor.ts` ne les touche pas. Schéma DB et mapping TS sains ; la rupture est **dans le prompt** :

- **`conditionnement`** (`:271`, écrit `:421`) : l'exemple du prompt (« Vrac 100g, Sachets x20, tube métal… ») pousse le LLM à écrire un format commercial issu de `conditionnementsOptions` au lieu du simple type « sachet ». Aucune règle d'enrichissement n'ancre le scalaire sur le type de packaging FD. La bonne valeur (« sachet ») est dans la **FD**. → Point de rupture : **PROMPT**.
- **`plusieursInfusions`** (`:236`, écrit `:426`) : aucune règle de conversion oui/non → booléen. Le garde-fou `?? false` ne rattrape que `null`, pas un `true` halluciné, qui s'écrit alors tel quel. Valeur correcte (« non » = `false`) disponible dans **FD et BDD**. → Point de rupture : **PROMPT**.

### H — audit IA

Deux causes combinées, plus de vraies lacunes de couverture.

**Cause (i) — mauvais onglet.** L'onglet « Audit IA » (`EtiquetteClient.tsx:947-952`) ne monte que `AuditSynthese` (retourne `null` tant qu'aucune voie n'a tourné, `audit-synthese.tsx:56`) + `DeterministicAuditPanel`. La voie visuelle/BAT (`BatTextAuditPanel`) — qui couvre Eurofeuille, WFTO, logos, présence allergène — est dans l'onglet **séparé** « BAT & Fichiers » (`value="pdf"`, `:957`). Marie qui ouvre « Audit IA » ne verra jamais ces points. De plus, rien ne tourne en auto : déclenchement par bouton dans les deux panneaux.

**Cause (ii) — exige un BAT PDF absent.** `auditVisuelTexteAction` cherche les PDF dans MinIO par préfixe `codePf` (`audit-visuel.ts:50-55`) ; sans BAT → `ok:false` et message d'erreur rouge. Ce n'est pas un crash (try/catch dégradent silencieusement).

**Couverture des 5 attentes de Marie :**

| Attendu Marie | Existe ? | Statut réel |
|---|---|---|
| Eurofeuille présente | 13.1 EUROFEUILLE (`control-checklist.ts:195`, manual) + robot visuel `pictos.ts:29` | Existe, mais uniquement voie visuelle/BAT |
| Code certificateur (code OC / FR-BIO-01) | 13.2 CODE_OC (`:203`, manual) | Aucun automatisme → ne remonte rien |
| Type d'agriculture (UE/non-UE) | 8.2 ORIGINE_AGRICULTURE_98 (`:151`, llm) | Déclaré **sans exécuteur** → ne remonte jamais |
| Cohérence / correction code EAN | **INEXISTANT** | `codeEan` chargé (`audit.ts:58`) mais aucun check ne le consomme |
| WFTO facing → phrase contre-étiquette | 13.3 LABELS_NON_OFFICIELS (`:207`, llm) ; logo `pictos.ts:33` | Règle croisée inexistante ; 13.3 sans exécuteur |
| Demeter → double étoile liste ingrédients | 2.4 INGR_ETOILES_BIO (`:70`, manual) | Aucun automatisme → ne remonte rien |
| Allergène en gras | 5.1 ALLERGEN (`:103`, deterministic), `particularites.ts:22` | Partiel : *déclaration* vérifiée, le « gras » renvoyé à un contrôle BAT manuel (`particularites.ts:36`) |

Sur 5 attentes, **1 seule** (déclaration allergène) est réellement en voie déterministe. Le check EAN n'existe pas ; les points 8.2 et 13.3 (llm) n'ont pas d'exécuteur ; code OC, double étoile Demeter et allergène-en-gras sont en `manual` pur.

**Déclencheurs :** deux boutons manuels, aucun auto-run. Voie déterministe (« Lancer », onglet Audit IA) ne nécessite aucun PDF, aucune persistance en base (`audit.ts:26` « No DB write yet »). Voie visuelle (« Analyser », onglet BAT & Fichiers) exige un BAT PDF ; écrit un `audit_log` de tokens (`audit-visuel.ts:135`).

### F / G / I — UI

Presque tout est de l'affichage :

- **Type de thé / origine** (`EtiquetteClient.tsx:500-501` via `DataPoint:105`) : classe CSS `truncate` qui coupe sur une ligne.
- **Allergène / allégation** (`:611,622`) : blocs gated par `hasRealValue` (`:59-63`), qui exclut `/`, `aucun`, `néant`, `non`, `n/a`, `-`, vide. Si la FD contient une de ces sentinelles, le bloc disparaît en lecture mais réapparaît en édition. D'où « mettre en visuel ce qui apparaît quand je clique sur modifier ».
- **Pitch** (`:812-819`) : **troncature non reproduite** — aucun `truncate`/`line-clamp`/`overflow-hidden` sur ce champ. À revérifier avec Marie.
- **« sous-dénomination »** (`:126`) : mauvais libellé UI ; le champ de données est déjà `sousDesignationFr`. Simple renommage.
- **« certif et labels »** : la carte « Identité & Sourcing » (`:486-565`) est en haut ; le bloc « Certification & labels » est enterré dans `DossierComplementaire.tsx:189`, en bas de page.
- **codePf** (`:391`) : `font-mono font-semibold text-emerald-800` dans un parent `text-sm` (~14 px), dans le fil d'ariane. Confort de taille.
- **Triman** : aucun champ/picto sur la fiche ni dans le schéma `produits`. Existe seulement dans l'audit (`control-checklist.ts:184`, `pictos.ts:30`). Vraie lacune côté fiche.
- **Volumineux** (`schema.ts:72`, chargé `page.tsx:69`, rendu `:547-554`) : existe en badge OUI/NON mais enterré dans le sous-bloc conditionnel « Données Brutes PMI » (`:527`) ; si `null`, disparaît.
- **Grille organoleptique** (`:685-789`) : bloc complet, toujours monté. Marie dit « pas besoin » → candidat au repli.

### Q6 — re-visualiser les documents chargés (FD + recette)

**La fonction n'existe pas.** L'import lit le buffer, extrait les données puis **jette le fichier** ; seul le *nom* est mémorisé (`fichierSourceNom`, `schema.ts:119`, écrit `importWorker.ts:523,636`). La colonne `fichierSourceId` (« Storage ref », `schema.ts:140`) est déclarée mais **jamais écrite ni lue**. Rien n'est poussé vers MinIO à l'import.

Confusion possible : l'onglet « BAT & Fichiers » affiche bien des fichiers MinIO, mais ce sont les **BAT de Fabrice** (trouvés par préfixe `codePf`, `page.tsx:103-110`), pas les FD/recette de Marie. Le bouton « Ré-intégrer » ne rouvre pas l'original : il ré-uploade une nouvelle copie en écrasant la cible.

Pour l'implémenter : persister le buffer FD/recette dans le bucket `label-assets` à l'import (préfixe `sources/<codePf>/`), stocker la clé dans `fichierSourceId`, exposer un lien via `getPresignedUrl` (conformément à CLAUDE.md, pas `getPublicUrl`). Emplacement logique : la carte « Base Documentaire & Ingrédients » (`:791-874`) ou à côté du menu « Ré-intégrer » du header.

---

## Découpage en lots, du plus rentable au moins rentable

Critère = temps de correction manuelle de Marie économisé ÷ effort.

**Lot 1 — Débloquer l'affichage (effort faible, énorme effet perçu).** Transforme une pile de « bloquants » en non-problèmes sans nouvelle logique : afficher code EAN + réglisse (déjà en base), dé-tronquer type de thé/origine, montrer allergène/allégation en lecture même sur valeurs sentinelles, renommer « sous-désignation », grossir codePf, remonter « certif & labels » dans « Identité & Sourcing », toujours afficher « volumineux ». → *La moitié du tableau de Marie tombe ici.*

**Lot 2 — Corriger le prompt d'extraction (effort faible).** Deux règles dans `buildExtractionPrompt` : ancrer `conditionnement` sur le type de packaging FD, mapper explicitement la case oui/non de `plusieursInfusions`. Deux champs bloquants sur 4 fiches, quasi gratuit.

**Lot 3 — Liste d'ingrédients, couche typographique (effort moyen, gros gain manuel).** Transformations déterministes sur string, faible risque : préfixe « Ingrédients : », casse majuscule/minuscule, astérisque bio + mention « *Issu de l'agriculture biologique. », italique noms latins, cas mono-ingrédient propre. Premier vrai allègement de sa saisie.

**Lot 4 — Audit IA visible (effort moyen).** Rebrancher la synthèse visuelle dans l'onglet « Audit IA », gérer proprement l'absence de BAT, ajouter le check EAN déterministe (donnée déjà chargée). Rend l'audit utile là où elle le cherche.

**Lot 5 — Liste d'ingrédients, couche sémantique (effort élevé).** Conversion/regroupement des arômes, masquage du nom du thé + compilation des quantités, « pétales de fleurs », libellés ERP. Plus gros gain restant mais nécessite une source de libellés légaux (table `articles` ou LLM cadré) — à spécifier avec Marie avant.

**Lot 6 — Re-visualisation des sources (effort moyen, confort).** Persister FD/recette dans MinIO à l'import + lien presigned.

**Lot 7 — Schéma BDD (effort élevé).** Créer les colonnes manquantes (3 codes étiquette, Anemos, Les Engagés, mention Demeter), peupler les logos, arbitrer badges texte vs images. Le plus structurant, le moins urgent pour réduire sa charge immédiate.

---

## Points à trancher avant d'attaquer

1. Confirmer avec Marie la troncature du pitch (non reproduite dans le code).
2. Pour le Lot 5, savoir d'où viennent les libellés légaux ERP — c'est le prérequis bloquant de toute la couche sémantique de la liste d'ingrédients.
