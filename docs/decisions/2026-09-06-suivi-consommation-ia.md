# Suivi de consommation IA — mise en place et points ouverts

> Session du 2026-09-06 avec Ouro. Contexte : démo chez Les Jardins de Gaïa le
> **vendredi 11 septembre 2026**, semaine dédiée à l'optimisation de l'app.
> Trois lots livrés et déployés. Ce document liste ce qui reste à affiner.

## Ce qui a été fait

### Panne initiale — deux causes cumulées

Tous les agents renvoyaient `❌ problème de connexion avec le Cerveau IA`. Diagnostic :

1. Le workspace Mistral était resté sur le **tier gratuit** (`403 tier_not_allowed` sur
   `mistral-large-latest`). Recharger des crédits ne débloque rien : c'est le **plan** du
   workspace qu'il fallait activer. Recréer une clé n'y change rien non plus — une clé
   hérite des droits de son workspace.
2. `pixtral-large-latest` a été **retiré du catalogue Mistral** (`400 invalid_model`),
   indépendamment du compte. Remplacé par `mistral-medium-latest`, vérifié en conditions
   réelles (accepte `document_url` avec un PDF base64 et renvoie le JSON attendu).

Le workspace est désormais plafonné à **10 $/mois** (Admin Panel › Subscription). Au-delà,
l'API renvoie 429 et **tous les agents s'arrêtent** jusqu'au mois suivant.

### Lot A — table `usage_ia`

Migration `drizzle/0009_spotty_scourge.sql`, appliquée en production le 2026-09-06.
Les tokens sont stockés bruts et exacts ; **le coût n'est pas stocké**, il est dérivé à la
lecture depuis `TARIFS` dans `src/agents/models.ts`, pour qu'un changement de tarif Mistral
ne laisse jamais de chiffres périmés en base.

⚠️ La base n'a **aucun suivi de migrations Drizzle** (`drizzle.__drizzle_migrations`
n'existe pas — le schéma a été poussé directement). Le runner `src/db/migrate.ts`
rejouerait les 9 migrations depuis zéro. À assainir.

### Lot B — point de passage unique

`src/agents/mistral-call.ts` enveloppe les 9 appels `chat.complete`, `src/agents/models.ts`
centralise modèles, tarifs et plafond. Plus aucun nom de modèle en dur ailleurs.
L'écriture d'usage est best-effort et non attendue : la comptabilité ne doit jamais
ajouter de latence ni casser une action utilisateur.

### Lot C — écran `/parametres/consommation`

La page Paramètres était une **maquette statique** (5 onglets = boutons sans routage).
Les onglets sont devenus de vraies sous-routes ; les panneaux non construits sont affichés
explicitement désactivés plutôt que faussement cliquables.

## Points ouverts — à traiter en priorité

### 1. L'audit IA n'a jamais tourné depuis la migration pixtral → mistral-medium

Le test du 2026-09-06 a lancé le panneau **audit déterministe**
(`auditDeterministeAction`), qui est du code pur sans appel LLM — d'où zéro consommation,
ce qui est le comportement attendu. Le panneau **audit BAT**
(`auditVisuelTexteAction`, robots sémantique + visuel) n'a pas été exercé.

**Le remplacement de `pixtral-large` n'est donc validé que par un test isolé de l'API,
pas par le vrai flux applicatif.** À faire en premier.

### 2. Lot D — messages d'erreur Mistral (§15 du registre de dette)

`AIChatAssistant.tsx:73` affiche le même message générique pour quatre causes distinctes :
clé invalide (401), tier bloqué (403), budget épuisé ou rate limit (429), modèle retiré
(400). Avec le plafond à 10 $, « budget du mois atteint » deviendra une panne muette pour
Marie. L'API renvoie déjà un champ `type` exploitable.

### 3. Restriction par rôle sur l'écran de consommation

Non posée (Ouro a dit « pour l'instant »). `session.user.role` est déjà disponible
(`auth.config.ts`, callbacks `jwt`/`session`). Cible évoquée : `DIRECTION` + `ADMIN`.
Trois niveaux nécessaires : onglet, page, query — cacher un lien ne protège pas une route.

Décision associée : **ne pas** afficher la consommation aux autres employés. Marie ne
décide pas du budget ; lui montrer un chiffre ajoute de la charge cognitive sans action
possible. Le besoin réel est le lot D — un message actionnable.

### 4. Attribution incomplète

- `utilisateurId` n'est renseigné que pour l'audit visuel et l'import CREATE (seuls
  endroits où la session descend jusqu'à l'agent).
- `entiteId` est absent de l'import CREATE : le `codePf` est le **résultat** de
  l'extraction, il n'existe pas au moment de l'appel. Le « coût par opération » ne se
  calcule donc que sur le ré-import.

## Anomalies constatées sur le test d'extraction TA7372

Test du 2026-09-06 : produit supprimé (sauvegarde dans
`/docker/gaialabel/backups/TA7372-avant-test-extraction-2026-09-06/`), ré-import de la
seule fiche dégustation Word puis réintégration de la recette Excel.

Coût mesuré : **0,0061 $ pour un import complet** (extraction + recette + embedding RAG),
soit 0,06 % du plafond mensuel.

### À trancher

1. **`codePf` : `TA7372` → `TA737`.** L'extraction raccourcit le code. Le BAT a quand même
   été trouvé parce que `findFileKeysByPrefix` fait un match **par préfixe** — `TA737`
   matche le dossier `TA7372 - Malin comme un chimpanzé`. Ça masque le problème et
   ouvrirait la porte à un mauvais BAT si un autre produit partageait le préfixe.
   Les fichiers sources sont eux-mêmes incohérents (`ETCNA7372V5` vs `ETNA737V5`).
2. **`plusieurs_infusions` : `true` → `false`.** Inversion factuelle à vérifier.
3. **Unités collées aux valeurs** : `3` → `3 mn`, `90` → `95°C`. Colonnes `varchar(50)`
   donc rien ne casse, mais deux formats coexistent désormais en base — tout tri ou
   comparaison numérique devient faux. La température change aussi de valeur (90 vs 95).
4. **`gamme` : `LES ENGAGÉS` → `Les Militants`**, `sous_gamme` perdue. Le JSON
   `conditionnements_options` extrait confirme « Les Militants ». Déterminer qui a raison.

### Confirmé bon

- `nom_latin = "Camellia sinensis"` — les correctifs récents (liste d'ingrédients écrite
  dans `nom_latin`, débordement varchar) tiennent en conditions réelles.
- **17 champs nouvellement remplis** qui étaient vides dans la fiche historique.
- Recette : 7 ingrédients, total 100 %, statut `VALIDATED`.

### Probablement normal, à confirmer

8 champs vidés (`code_ean`, `poids_net`, `poids_tasse`, `nb_tasses`, `conditionnement`,
`sous_gamme`, traductions EN). Seule la fiche dégustation a été importée ; ces champs
viennent de la fiche article / PMI. À confirmer avant de conclure à une régression.

## Dette technique connexe

Voir `docs/tech-debt.md` : §13 et §14 résorbés, §15 ouvert (messages d'erreur), §16 ajouté
(`import-agent.ts` et `pdf-comparison-agent.ts` ne sont référencés nulle part — code mort
à confirmer puis supprimer).
