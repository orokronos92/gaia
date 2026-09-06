# Dette technique — registre

> Registre vivant de la dette technique de GaïaLabel : ce qui est volontairement
> laissé en l'état, son impact, et la **solution technique** envisagée pour plus
> tard. Mettre à jour quand une dette est créée, aggravée ou résorbée.
>
> Convention : chaque item = **Constat** / **Impact** / **Solution** / **Fichiers**.
> Les items marqués 🔴 sont risqués/prioritaires, 🟠 moyens, 🟡 cosmétiques.

---

## 1. 🔴 `ImportWorker.processImport` — fichier énorme, `any`, sans test, extraction dupliquée

**Constat.** `src/agents/imports/importWorker.ts` fait ~640 lignes (limite CLAUDE.md = 300),
contient ~6 `any` préexistants, et le chemin CREATE (`processImport`) **n'a aucun test**.
Lors de la réconciliation des sources (Lot 3b), l'extraction produit/dégustation a été
**volontairement dupliquée** dans `extraireProduitDegustation` plutôt que de refactorer
`processImport` (risque de régression non détectable faute de test).

**Impact.** Maintenance fragile ; duplication à maintenir en double ; toute évolution du
mapping produit/fiche doit être faite à deux endroits.

**Solution.**
1. Écrire d'abord un **test d'intégration** de `processImport` en mockant uniquement les
   frontières externes (SDK Mistral + `db`) — pas les méthodes privées (l'anti-pattern qui
   avait cassé `importWorker.test.ts`).
2. Une fois couvert, **extraire les value-builders** (`mapProduitValues`, `buildFicheValues`,
   `buildDegustationValues` — ce dernier existe déjà) et l'extraction (`extraireProduitDegustation`,
   déjà extrait) pour que CREATE et RE-IMPORT partagent le même code.
3. Découper le fichier : `importWorker.ts` (orchestration), `extractors/` (docx/pdf/xlsx),
   `mappers/` (p → valeurs DB), `persistence` via `src/db/queries/`.

**Fichiers.** `src/agents/imports/importWorker.ts`, `src/tests/agents/importWorker.test.ts`.

---

## 2. 🟠 `EtiquetteClient.tsx` — 1300+ lignes, `any`, entités non échappées

**Constat.** `src/app/(dashboard)/etiquettes/[id]/EtiquetteClient.tsx` dépasse 1300 lignes
(limite 300), avec de nombreux `any` (`labelData: any`, `auditResult: any`, helpers `icon: any`)
et des `react/no-unescaped-entities`. C'est le « gros fichier » que CLAUDE.md pointe comme
mauvais patron à refactorer, pas à répliquer.

**Impact.** Difficile à raisonner ; chaque ajout (panneaux audit, ré-import…) se monte par un
tag mais le corps reste monolithique ; lint bruyant.

**Solution.** Extraire par onglet/section dans `_components/` (déjà commencé :
`deterministic-audit-panel`, `reintegrer-recette`). Typer `labelData` (dériver de
`InferSelectModel` des tables) au lieu de `any`. Échapper les entités ou passer en
`{"'"}`/chaînes. À faire onglet par onglet, sans big-bang.

**Fichiers.** `src/app/(dashboard)/etiquettes/[id]/EtiquetteClient.tsx`.

---

## 3. 🟠 Frontière `src/agents/**` → `@/db` violée

**Constat.** CLAUDE.md §3 : les agents ne doivent pas importer `@/db` directement, mais
passer par `src/db/queries/`. Or `importWorker`, `auditWorker` et `RAGService` importent
`@/db` + `@/db/schema` et écrivent en direct. Le nouveau code de réconciliation a respecté la
frontière côté queries (`saveRecette`, `getFicheProduitId`, `alignerListeIngredients`) mais
`reintegrerDegustation` écrit en direct (cohérent avec le pattern existant du fichier).

**Impact.** Couplage logique IA ↔ forme DB ; la règle d'architecture n'est pas tenue.

**Solution.** Déplacer toutes les écritures de ces agents vers `src/db/queries/`
(`produits.ts`, `fiches.ts`, `degustation.ts`). Les agents ne gardent que l'extraction/LLM et
appellent les queries. À faire avec le refactor de l'item 1.

**Fichiers.** `src/agents/imports/importWorker.ts`, `src/agents/audit/auditWorker.ts`,
`src/agents/knowledge/RAGService.ts`.

---

## 4. 🟡 `useCalculatrice` — `setState` synchrone dans un `useEffect`

**Constat.** `src/hooks/useCalculatrice.ts` (~ligne 222) fait `setResultat(null)` en début
d'effet → warning eslint `react-hooks` « cascading renders ». Préexistant.

**Impact.** Re-renders en cascade possibles (perf mineure) ; warning lint.

**Solution.** Dériver `resultat` en `useMemo` (calcul pur synchrone, le debounce ne sert que
contre la frappe) ou déplacer le `setResultat(null)` hors du corps synchrone.

**Fichiers.** `src/hooks/useCalculatrice.ts`.

---

## 5. 🟡 Recettes DRAFT qui s'accumulent

**Constat.** `saveRecette` **insère** une nouvelle ligne `recettes` à chaque import /
ré-import (le « dernier par `creeLe` » gagne). Les anciennes DRAFT restent orphelines.

**Impact.** Lignes mortes en base (inoffensives — la lecture prend la plus récente).

**Solution.** À l'import/ré-import, supprimer les DRAFT antérieures du produit avant l'insert,
ou faire un upsert de la dernière DRAFT (comme `validerRecette` qui remplace).

**Fichiers.** `src/db/queries/recettes.ts`, `src/agents/imports/recetteExtractor.ts` (appelant).

---

## 6. 🟠 `est_camellia` non renseigné → contrôle d'audit 1.1 toujours NA

**Constat.** L'extraction recette et `saveRecette` ne renseignent pas `ingredients_recette.est_camellia`
(défaut `false`). Donc le contrôle déterministe **1.1 (dénomination « thé » ≥ 51 % Camellia)**
reste **NA** même pour un vrai thé. Il n'y a pas de toggle Camellia dans l'UI recette.

**Impact.** Un contrôle réglementaire dort tant que le flag n'est pas posé.

**Solution.** (a) Demander à l'IA d'extraire un `estCamellia` par ingrédient (nom latin /
désignation) ; (b) ajouter un toggle « Camellia (thé) » dans la calculatrice ; (c) repli
déterministe par nom latin. Voir [[project-audit-rewrite]].

**Fichiers.** `src/agents/imports/recetteExtractor.ts`, `src/components/recette/`,
`src/lib/audit/build-context.ts`.

---

## 7. 🟠 `controles_conformite` — enum legacy vs nouveau modèle 35 points

**Constat.** La table `controles_conformite` utilise un `pgEnum TypeControle` (14 valeurs)
qui ne correspond ni au worker LLM legacy (5 valeurs) ni au référentiel 35 points
(`src/lib/audit/control-checklist.ts`). La Voie A est aujourd'hui **read-only** (pas de
persistance) pour éviter ce conflit.

**Impact.** Le nouveau modèle d'audit ne peut pas encore être persisté proprement ; la Voie C
(cases manuelles de Marie) nécessitera un vrai stockage.

**Solution.** Nouvelle table `audit_resultats` (`controlPointId` stable, `mode`, `statut`,
`justification`, `ficheId`, `run`, date) ; la DB stocke l'`id` métier, pas un enum rigide.
Voir [[project-audit-rewrite]] (décision read-only first).

**Fichiers.** `src/db/schema.ts`, `src/lib/audit/`, futur `src/db/queries/audit-resultats.ts`.

---

## 8. 🟡 Dockerfile installe TypeScript au runtime / `next.config.ts`

**Constat.** Le Dockerfile installe TS au runtime (anti-pattern connu, CLAUDE.md §10). Au
démarrage, `next start` logue « Failed to load next.config.ts — Cannot find module typescript ».
Sans impact aujourd'hui car `next.config.ts` est **vide** (Next retombe sur les défauts).

**Impact.** Bruit au démarrage ; si `next.config.ts` reçoit de la config un jour, elle serait
**ignorée** au runtime.

**Solution.** Compiler `next.config.ts` → `.js` au build (ou config en `.mjs`), et ne pas
dépendre de TS au runtime. Build multi-stage propre.

**Fichiers.** `Dockerfile`, `next.config.ts`.

---

## 9. 🟡 MinIO `getPublicUrl` → `getPresignedUrl`

**Constat.** CLAUDE.md §8/§10 : les URLs fichiers MinIO utilisent `getPublicUrl` (bucket
public-read, acceptable pour démo). Migration vers `getPresignedUrl` prévue.

**Impact.** Fichiers accessibles sans contrôle d'accès.

**Solution.** Basculer tout accès fichier vers `getPresignedUrl` (URLs signées, expirantes) ;
politique de bucket privée.

**Fichiers.** `src/lib/utils/s3-client.ts` et appelants.

---

## 11. ✅ Import — fusion silencieuse sur `codePf` existant (RÉSORBÉ 2026-06-09)

**Constat (résolu).** `processImport` faisait un upsert silencieux sur `codePf`. Désormais :
verrou avec avertissement 4 choix (Ouvrir sa fiche / Écraser / Créer une nouvelle fiche à titre
vide / Annuler). Détail : `docs/decisions/2026-06-09-reconciliation-sources.md`.

**Reste.** ✅ Le staging deux-temps est fait (2026-06-09) : les documents sont mis en attente
(un par rôle), Marie revoit, puis « Lancer l'analyse IA ». L'IA ne part plus au 1er fichier.

**Fichiers.** `src/agents/imports/importWorker.ts`, `src/db/queries/produits.ts`,
`src/app/api/agents/import/route.ts`, `src/components/features/ImportDossierArea.tsx`.

---

## 12. 🟡 Calculatrice — saisie % affichée en float brut (round-trip)

**Constat.** Au rechargement d'une recette dont les kg ont été dérivés (% + masse principale),
`etatDepuisRecette` recalcule `pourcentageSaisi = kgVersPct(kg, lot)` → bruit flottant
(`62.000012400024799`). La cellule l'affiche en `String(value)`, sans arrondi (le `% étiquette`,
lui, reste propre via l'arrondi moteur).

**Impact.** Affichage moche dans la colonne « Saisie (%) » ; cosmétique, valeur exacte préservée.

**Solution.** Arrondir la **saisie dérivée** pour l'affichage (ex. `pourcentageSaisi` arrondi à
1–2 décimales dans `etatDepuisRecette`, ou `toFixed` côté cellule). Faible risque.

**Fichiers.** `src/hooks/useCalculatrice.ts` (`etatDepuisRecette`),
`src/components/recette/RecetteCalculatorRow.tsx`.

---

## 10. 🟡 Route d'import — historique sans `auth()` (résorbé)

**Constat / résolu.** `POST /api/agents/import` était **sans authentification**. Corrigé au
Lot 2 de la réconciliation (ajout `auth()` + `userId`). Conservé ici pour mémoire :
**auditer les autres routes** `src/app/api/agents/*` de la même façon.

**Fichiers.** `src/app/api/agents/**/route.ts`.

---

## 13. ✅ Noms de modèles Mistral hardcodés dans 8 fichiers (RÉSORBÉ 2026-09-06)

**Constat.** Chaque agent code en dur son modèle : `copilot-agent.ts:74` et `:156`,
`importWorker.ts:376` et `:621`, `recetteExtractor.ts:22`, `auditWorker.ts:9`,
`semantic-robot.ts:17`, plus le défaut du constructeur `MistralProvider.ts:12`.
Violation directe de la règle « no magic strings » du CLAUDE.md.

**Impact.** Démontré en production le 2026-09-06 : Mistral a retiré `pixtral-large-latest`
de son catalogue et le workspace était resté sur le tier gratuit (403 `tier_not_allowed`
sur `mistral-large-latest`). Diagnostiquer puis basculer de modèle a demandé de toucher
plusieurs fichiers au lieu d'une variable. Aucun moyen de tester un modèle moins cher,
ni de dégrader temporairement vers `ministral-14b` si le budget mensuel est atteint.

**Résolu.** `src/agents/models.ts` expose `TEXT_MODEL`, `VISION_MODEL`, `EMBEDDING_MODEL`
(surchargeables par env) ainsi que la grille tarifaire et `PLAFOND_MENSUEL_USD`. Les 9 sites
d'appel passent désormais par `src/agents/mistral-call.ts`. Plus aucun nom de modèle en dur
hors `models.ts`.

**Fichiers.** `src/agents/copilot-agent.ts`, `src/agents/imports/importWorker.ts`,
`src/agents/imports/recetteExtractor.ts`, `src/agents/audit/auditWorker.ts`,
`src/agents/audit/semantic-robot.ts`, `src/agents/audit/visual-robot.ts`,
`src/agents/MistralProvider.ts`, `src/agents/knowledge/RAGService.ts`.

---

## 14. ✅ Consommation de tokens non persistée (RÉSORBÉ 2026-09-06)

**Constat.** Le CLAUDE.md affirme « token usage is logged in `audit_logs` ». C'est vrai pour
**un agent sur quatre** : seul l'audit visuel écrit ses tokens (`audit-visuel.ts:140`, dans
`changements.tokensUsed`). Les imports, l'audit conformité et le copilot consomment sans
rien persister, alors que `tokensUsed` remonte déjà partout (`BaseAgent.ts:190`,
`MistralProvider.ts:41`). La table `audit_logs` (`schema.ts:262`) n'a d'ailleurs pas de
colonne dédiée — le comptage passe par un `json` non typé, non indexable.

**Impact.** ~80 % de la consommation est invisible. Impossible de répondre à « combien coûte
un import ? » sans requêter l'API Mistral. Le workspace est plafonné à 10 $/mois : quand le
plafond sera atteint, l'API renverra 429 et personne ne saura pourquoi l'app est cassée.

**Résolu.** Table `usage_ia` (migration `drizzle/0009_spotty_scourge.sql`), écriture
best-effort via `src/db/queries/usage-ia.ts`, alimentée par `callMistral` (chat) et
directement par `RAGService` (embeddings, endpoint distinct). Écran de suivi sur
`/parametres/consommation`. Le coût n'est **pas** stocké : il est dérivé à la lecture depuis
`TARIFS` dans `models.ts`, pour qu'un changement de tarif Mistral ne laisse pas de chiffres
périmés en base.

**Reste ouvert.** `utilisateurId` n'est renseigné que pour l'audit visuel et l'import CREATE
(seuls endroits où la session descend jusqu'à l'agent). `entiteId` est absent de l'import
CREATE, le `codePf` étant le *résultat* de l'extraction — le coût moyen par import se calcule
donc sur le ré-import uniquement.

**Fichiers.** `src/db/schema.ts`, `src/agents/MistralProvider.ts`, `src/agents/BaseAgent.ts`,
`src/app/actions/audit-visuel.ts`, `src/db/queries/` (nouveau fichier).

---

## 15. 🟡 Message d'erreur IA générique — trois causes indistinguables

**Constat.** `AIChatAssistant.tsx:73` affiche `❌ Désolé, je rencontre un problème de
connexion avec le Cerveau IA` quelle que soit la cause réelle : clé invalide (401),
modèle non autorisé par le tier (403), budget mensuel épuisé ou rate limit (429),
modèle retiré du catalogue (400 `invalid_model`).

**Impact.** Vécu le 2026-09-06 : il a fallu interroger l'API en ligne de commande pour
comprendre que le tier bloquait. Pour Marie, « budget du mois épuisé » et « bug applicatif »
sont le même écran — elle ne peut ni agir, ni remonter une information utile.

**Solution.** Mapper le code d'erreur Mistral vers un message actionnable côté serveur
(l'API renvoie déjà `type` : `tier_not_allowed`, `rate_limited`, `invalid_model`) et le
remonter dans la réponse de la Server Action. Ne jamais exposer la clé ni le détail brut.

**Fichiers.** `src/components/features/AIChatAssistant.tsx`, `src/agents/MistralProvider.ts`.


---

## 16. 🟡 `import-agent.ts` et `pdf-comparison-agent.ts` — code mort

**Constat.** Ni `ImportAgent` ni `PdfComparisonAgent` n'est référencé nulle part dans `src/`
(vérifié 2026-09-06). Ils instancient `MistralProvider` et suivent la boucle ReAct de
`BaseAgent`, mais aucun appelant n'existe.

**Impact.** Faible, mais ils faussent toute lecture du périmètre agents : lors de la
centralisation des modèles, ils ont dû être analysés pour rien.

**Solution.** Confirmer avec Ouro qu'ils sont abandonnés, puis supprimer. Si l'un doit
revivre, le rebrancher sur `callMistral` et lui attribuer une valeur de l'enum `agent_ia`.

**Fichiers.** `src/agents/import-agent.ts`, `src/agents/pdf-comparison-agent.ts`.
