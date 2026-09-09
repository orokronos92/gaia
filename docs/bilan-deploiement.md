# GaïaLabel — bilan technique du déploiement

**Arrêté au 9 septembre 2026.** Application en production sur
`https://gaialabel.srv1301090.hstgr.cloud`, développée du 18 mai au 9 septembre
2026 — **184 livraisons** de code.

---

## 1. Ce qui tourne

| Brique | Choix | État |
|---|---|---|
| **Serveur** | VPS Hostinger, Ubuntu 24.04 | en production |
| **Application** | Next.js 16 · React 19 · TypeScript strict | conteneur Docker |
| **Base de données** | PostgreSQL 16 + pgvector | sur l'hôte, hors conteneur |
| **Stockage de fichiers** | MinIO, compatible S3 | conteneur Docker |
| **Routage et HTTPS** | Traefik, certificat automatique | en production |
| **Intelligence artificielle** | Mistral (texte et vision) | à la demande |
| **Authentification** | NextAuth v5, sessions serveur | en production |

Deux conteneurs seulement : l'application et le stockage. La base vit sur
l'hôte, ce qui la met hors de portée d'un redéploiement de l'application.

---

## 2. L'application

**28 700 lignes de code** réparties sur **224 fichiers**, sans aucune ligne
générée automatiquement ni copiée d'un gabarit.

| Domaine | Lignes | Fichiers | Rôle |
|---|---|---|---|
| Interfaces (`app/`) | 7 876 | 69 | Pages, routes, actions serveur |
| Composants (`components/`) | 5 415 | 48 | Éléments d'interface réutilisables |
| Règles métier (`lib/`) | 6 927 | 50 | Calculs, contrôles, lecture des PDF |
| Base de données (`db/`) | 2 684 | 18 | Schéma et requêtes |
| Agents IA (`agents/`) | 2 465 | 14 | Import, audit, copilote, RAG |
| Tests (`tests/`) | 2 835 | 23 | 244 tests automatisés |

### Les 15 écrans

| Écran | Ce qu'il permet |
|---|---|
| **Tableau de bord** | Vue d'ensemble du pipeline et des alertes |
| **Étiquettes** | Le pipeline : toutes les fiches et leur statut |
| **Fiche étiquette** | L'écran de travail : dossier produit, recette, contrôle, historique |
| **Nouvelle étiquette** | Import de documents et création guidée |
| **Produits** | Le catalogue, recherche par code, nom, gamme |
| **Commandes** | Suivi des demandes en cours |
| **Contrôle graphisme** | Analyse d'un bon à tirer isolé |
| **Connaissances** | Corpus documentaire interrogeable (139 documents) |
| **Archives** | Registre des produits retirés, non réversible |
| **Notifications** | Flux temps réel des événements |
| **Paramètres** | Réglages généraux |
| **Paramètres · Consommation IA** | Coût réel de chaque appel de modèle |
| **Paramètres · Matières** | Référentiel des matières premières |
| **Connexion** | Authentification |
| *Démonstration provenance* | Écran de démonstration de la traçabilité |

**10 routes de service** en arrière-plan : rendu des bons à tirer, import,
audit, dialogue avec le copilote, notifications en flux continu,
authentification, dépôt de documents.

### Composition de l'interface

**69 composants** : 15 primitives d'interface, 33 composants métier partagés,
21 composants propres à un écran.

**24 actions serveur** réparties sur 14 modules. Chacune valide ses entrées
avant toute écriture et vérifie la session de l'utilisateur.

---

## 3. La base de données

**19 tables, 261 colonnes, 11 Mo.** Le schéma est décrit dans le code et
appliqué par **17 migrations** successives et versionnées.

| Table | Lignes | Contenu |
|---|---|---|
| `fichiers_etiquettes` | 628 | Liens produit ↔ fichier, là où l'association était devinée |
| `audit_logs` | 248 | Journal nominatif de chaque action |
| `fiches_etiquettes` | 178 | Les fiches d'étiquette |
| `produits` | 158 | Le catalogue, actifs et archivés |
| `knowledge_documents` | 139 | Corpus documentaire vectorisé |
| `ingredients_recette` | 116 | Lignes de recette |
| `usage_ia` | 99 | Chaque appel de modèle, avec son coût |
| `versions_etiquettes` | 36 | Historique des versions de fiche |
| `validations_controle` | 26 | Décisions de la Qualité, datées et signées |
| `controles_conformite` | 23 | Résultats d'audit conservés |
| `recettes` | 16 | Recettes, courantes et archivées |
| `documents_import` | 14 | Documents sources conservés |
| `fiches_degustation` | 11 | Grilles organoleptiques |
| `matieres_premieres` | 7 | Référentiel matières |
| `utilisateurs` | 3 | Comptes |

**1 702 enregistrements** au total.

---

## 4. Le stockage de fichiers

**601 objets, 927 Mo** dans le compartiment `label-assets` : les bons à tirer
au format PDF et Illustrator, les documents d'import, le corpus documentaire.

Chaque fichier reste lié à son produit par une association enregistrée, et les
documents sources d'un import sont conservés — un import raté reste rejouable.

---

## 5. Les agents d'intelligence artificielle

**14 modules**, tous adossés à Mistral.

| Agent | Ce qu'il fait |
|---|---|
| **Import** | Lit les documents Word, PDF et Excel reçus, en extrait les données de la fiche |
| **Extraction de recette** | Lit le classeur de recette et en tire la composition structurée |
| **Audit sémantique** | Juge les équivalences de sens que le calcul ne tranche pas |
| **Audit visuel** | Reconnaît les logos sur le bon à tirer |
| **Copilote** | Répond aux questions sur une fiche |
| **Recherche documentaire** | Interroge le corpus par proximité de sens |
| **Comparaison de PDF** | Confronte deux versions d'un bon à tirer |

**Le coût de chaque appel est mesuré et enregistré** — 99 appels tracés à ce
jour. Un import complet a été mesuré à **0,006 $**.

---

## 6. Les contrôles réglementaires

**42 points de contrôle**, transposition de PRO-QHS-013 et MOP-PRO-029.

| Voie | Points | IA |
|---|---|---|
| Code, sur la fiche | 20 | non |
| Code, sur le bon à tirer | 11 | non |
| Modèle | 7 | oui |
| Œil de la Qualité | 4 | — |

**31 des 42 contrôles s'exécutent sans consommer un jeton**, à chaque
lancement. Le détail de chacun figure dans `docs/controles-definitions.md`.

Ce que ces contrôles ont mesuré sur l'ensemble du catalogue : 17 Eurofeuilles
sous le minimum légal, 2 produits à la réglisse sans avertissement, 2 codes-
barres partagés par deux produits, 4 conditionnements incohérents avec le poids
net, une allégation incomplète, trois mentions WFTO partielles.

---

## 7. Ce qui garantit la reprise

**244 tests automatisés** rejoués à chaque modification, dont plusieurs
comparent le calcul à une fiche réelle validée par le client.

**17 migrations de base** versionnées, rejouables dans l'ordre.

**184 livraisons de code**, chacune décrivant ce qu'elle change et pourquoi.

**Aucun secret dans le code** : identifiants, clés et adresses vivent hors du
dépôt.

**43 dépendances** au total — 26 en production, 17 pour le développement.
Chacune est épinglée à une version connue.

---

## 8. Documentation livrée

| Document | Objet |
|---|---|
| `controles-definitions.md` | Les 42 contrôles, définis un par un |
| `controles-etiquette.md` | La grille de contrôle, par section de la procédure |
| `visitegaia1109.md` | Les questions ouvertes, classées par interlocuteur |
| `tech-debt.md` | Registre de la dette technique assumée |
| `decisions/` | Les décisions structurantes, datées et motivées |
| `referentiels/` | Les procédures client de référence |
