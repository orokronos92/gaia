# PRD-07 — Roadmap de développement

## Vue d'ensemble

6 phases séquentielles. Chaque phase produit un livrable utilisable.

```
Phase 0 ─ Setup           3-4 jours
Phase 1 ─ Données & UI    8-10 jours   ← premier livrable pour Marie
Phase 2 ─ Workflow         5-6 jours
Phase 3 ─ Règles métier   6-8 jours
Phase 4 ─ Agents IA       8-10 jours
Phase 5 ─ Dashboard        4-5 jours
Phase 6 ─ Import/Export   3-4 jours
                          ─────────
                          37-47 jours
```

---

## Phase 0 — Setup technique (3-4 jours)

### Livrables
- Projet Next.js 15 initialisé (App Router, TypeScript)
- Tailwind + shadcn/ui configurés avec les couleurs Gaïa (voir PRD-02)
- Prisma + PostgreSQL avec le schéma complet (voir PRD-01)
- Docker Compose fonctionnel (postgres + app)
- NextAuth.js configuré (Credentials provider, 6 users seed)
- StorageService avec adaptateur local
- Structure de dossiers complète

### Tâches
1. `npx create-next-app` avec TypeScript, Tailwind, App Router
2. Installer shadcn/ui, configurer `tailwind.config.ts` avec la palette Gaïa
3. Installer Prisma, créer le `schema.prisma` complet (copier depuis PRD-01)
4. `npx prisma migrate dev` — vérifier que le schéma passe
5. Créer `prisma/seed.ts` avec les 6 utilisateurs initiaux
6. Configurer NextAuth.js (Credentials, middleware de protection des routes)
7. Créer l'abstraction StorageService + adaptateur local (écriture sur disque)
8. Docker Compose : `postgres:16` + volume persistant
9. `.env.example` avec toutes les variables
10. Vérifier : `npm run dev` → page blanche OK, login fonctionnel

### Critère de validation
L'app démarre, on peut se connecter avec marie@jardinsdegaia.com et on arrive sur une page vide protégée.

---

## Phase 1 — Données produits & UI de base (8-10 jours)

### Livrables
- Écran d'authentification immersif (PRD-02, écran 0)
- Layout global : sidebar + header (PRD-02)
- Liste des produits avec recherche et filtres (PRD-02, écran 2)
- Fiche produit avec onglet Étiquette (PRD-02, écran 3)
- Fiche produit avec onglet Recette (PRD-02, écran 3)
- Import des 802 produits depuis l'Excel (PRD-05)

### Tâches

**Jour 1-2 : Auth + Layout**
1. Page login `/login` — split gauche photo / droite formulaire (PRD-02 écran 0)
2. Layout dashboard `(dashboard)/layout.tsx` — sidebar + header
3. Composants partagés : StatusBadge, LabelBadge, DataTable
4. Middleware NextAuth : redirection si non connecté

**Jour 3-4 : Import données**
5. Script `scripts/import-excel.ts` (PRD-05) — parsing BDD_étiquettes_2025
6. Créer les Product, ProductLabel, LabelSheet pour les 802 produits
7. Valider : compter les produits, vérifier quelques fiches connues (MT265, TB4041)

**Jour 5-7 : Liste produits**
8. Page `/produits` — tableau dense avec DataTable
9. Recherche full-text (server-side, Prisma `contains` ou `search`)
10. Filtres : gamme, type thé, labels, statut, aromatisé, allégation
11. Pagination serveur (50/page)
12. Tri cliquable sur les colonnes
13. Bouton export Excel

**Jour 8-10 : Fiche produit**
14. Page `/produits/[code]` — header produit + onglets
15. Onglet Étiquette : affichage de tous les champs, édition inline pour QUALITE
16. Onglet Recette : tableau d'ingrédients, calcul % en temps réel
17. Server Actions pour save des modifications
18. AuditLog sur chaque modification

### Critère de validation
Marie peut chercher un produit parmi les 802, ouvrir sa fiche, voir et modifier les données d'étiquette et de recette. Les modifications sont sauvegardées et tracées.

---

## Phase 2 — Workflow de validation (5-6 jours)

### Livrables
- Machine à états fonctionnelle (PRD-06)
- Pipeline kanban (PRD-02, écran 4)
- Commentaires sur les fiches
- Notifications in-app

### Tâches

**Jour 1-2 : Machine à états**
1. Implémenter `lib/workflow/transitions.ts` (PRD-06)
2. Bouton "Changer statut" dans le header de la fiche produit
3. Affiche les transitions disponibles selon le rôle et les conditions
4. Persister le changement + créer un AuditLog + une LabelVersion (snapshot)

**Jour 3 : Pipeline kanban**
5. Page `/etiquettes` — vue kanban (4 colonnes)
6. Vue liste alternative (tableau)
7. Switch kanban/liste
8. Cards cliquables vers la fiche produit

**Jour 4 : Commentaires**
9. Modèle LabelComment, API CRUD
10. UI : icône 💬 sur chaque champ + popover avec fil
11. Fil général en bas de fiche

**Jour 5-6 : Notifications**
12. Fonction `notify()` (PRD-06)
13. Déclenchement automatique sur transitions
14. UI : cloche dans le header + dropdown + badge non lues
15. Marquer comme lu au clic

### Critère de validation
Marie crée une fiche, la soumet en vérification. Fabrice est notifié. Il uploade un PDF (stockage local), soumet pour review. Marie est notifiée, peut commenter sur un champ spécifique. Le kanban reflète les statuts en temps réel.

---

## Phase 3 — Règles métier automatiques (6-8 jours)

### Livrables
- Moteur d'arrondis automatique (PRD-03, règle 1)
- Détermination dénomination légale (PRD-03, règle 2)
- Contrôle QUID (PRD-03, règle 3)
- Détection allégations santé (PRD-03, règle 4)
- Contrôle réglisse (PRD-03, règle 5)
- Cohérence labels (PRD-03, règle 6)
- Onglet Conformité fonctionnel (PRD-02, écran 3)

### Tâches

**Jour 1-2 : Arrondis**
1. `lib/business-rules/rounding.ts` — algorithme complet (PRD-03 règle 1)
2. Tests unitaires avec les cas du PRD-03
3. Intégrer dans l'onglet Recette : calcul auto quand qty change
4. Affichage : ligne total colorée + message ajustement

**Jour 3-4 : Dénomination + QUID + Allégations**
5. `lib/business-rules/denomination.ts` (PRD-03 règle 2)
6. `lib/business-rules/quid.ts` (PRD-03 règle 3)
7. `lib/business-rules/allegations.ts` (PRD-03 règle 4)
8. Tests unitaires pour chaque règle

**Jour 5 : Réglisse + Labels**
9. `lib/business-rules/reglisse.ts` (PRD-03 règle 5)
10. `lib/business-rules/labels-coherence.ts` (PRD-03 règle 6)

**Jour 6-8 : Onglet Conformité**
11. Page ConformityCheck — exécuter tous les checks sur save
12. Tableau de résultats : check | statut (badge) | détail
13. Expandable par check pour voir le détail
14. Bouton [Justifier] sur les WARNING → textarea + save
15. Condition de validation : blocage si FAIL, warning si WARNING non justifié
16. Exécution automatique des checks quand la fiche passe en QUALITY_REVIEW

### Critère de validation
Sur le Maté Sportif (MT265) : les arrondis sont calculés automatiquement (100.0%), la dénomination "Mélange de plantes aromatisé" est proposée, l'allégation "Tonifiant" est détectée avec les 3 mentions vérifiées, les labels AB+WFTO+MH sont cohérents. Marie ne peut pas valider s'il reste un FAIL.

---

## Phase 4 — Agents IA (8-10 jours)

### Livrables
- Agent Import : pré-remplissage de fiche depuis Word+Excel (PRD-04, agent 1)
- Agent Audit réglementaire (PRD-04, agent 2)
- Agent Comparaison Excel↔PDF (PRD-04, agent 3)
- Écran comparaison 3 colonnes (PRD-02, écran 5)

### Tâches

**Jour 1-3 : Agent Import**
1. `lib/ai/client.ts` — setup Anthropic SDK
2. `lib/utils/word-parser.ts` — extraction texte brut depuis .docx
3. `lib/utils/excel-parser.ts` — parsing fiche recette
4. `lib/ai/agents/import-agent.ts` — prompt + parsing JSON (PRD-04 agent 1)
5. Page `/produits/[code]/import` — UI upload + résultat (PRD-02 écran 7)
6. Fusion des données Word+Excel + calculs automatiques (règles Phase 3)
7. Création du Product + Recipe + LabelSheet en DRAFT
8. Tester avec MT265 (FD_MT265_Maté_sportif_v0.docx + MT165_MATE_SPORTIF.xlsx)

**Jour 4-5 : Agent Audit**
9. `lib/ai/agents/regulatory-checker.ts` — prompt + parsing (PRD-04 agent 2)
10. `lib/ai/prompts/regulatory-rules.ts` — PRO-QHS-013 encodée en contexte
11. Bouton [🤖 Lancer audit IA] dans onglet Conformité
12. Streaming de la réponse (affichage progressif)
13. Persistance du résultat en ConformityCheck

**Jour 6-8 : Agent Comparaison PDF**
14. `lib/utils/pdf-extractor.ts` — extraction texte depuis PDF (pdf-parse)
15. `lib/ai/agents/pdf-comparator.ts` — prompt comparaison (PRD-04 agent 3)
16. Page `/etiquettes/[id]/comparaison` — UI 3 colonnes (PRD-02 écran 5)
17. Diff champ par champ avec surlignage couleur
18. Boutons [Tout valider] / [Demander modification]
19. Tester avec une étiquette réelle (ETTUTO3542_POÉSIE_EN_ROSE.pdf)

**Jour 9-10 : Agent BAT (si temps)**
20. `lib/ai/agents/visual-checker.ts` — Claude Vision (PRD-04 agent 4)
21. Upload photo par Céline dans l'onglet Commandes
22. Rapport visuel structuré

### Critère de validation
Marie uploade la fiche dégustation MT265 + la fiche recette → obtient une fiche pré-remplie avec 24+ champs en 30 secondes. L'audit IA retourne un rapport structuré. La comparaison Excel↔PDF de "Poésie en Rose" identifie correctement les champs.

---

## Phase 5 — Dashboard & commandes (4-5 jours)

### Livrables
- Dashboard principal (PRD-02, écran 1)
- Commandes & suivi délais (PRD-02, écran 6)
- Onglet Commandes dans la fiche produit (PRD-02, écran 3)
- Onglet Historique dans la fiche produit

### Tâches

**Jour 1-2 : Dashboard**
1. KPIs : requêtes agrégées (fiches en attente, alertes, PDFs à vérifier, commandes)
2. Section "Mes tâches" filtrée par rôle
3. Section "Activité récente" (derniers AuditLog)
4. Section "Délais imprimeurs" (stats agrégées)

**Jour 3-4 : Commandes**
5. Page `/commandes` — liste des commandes avec stats
6. Formulaire création commande (Pascal)
7. Timeline horizontale par commande (barres progression par étape)
8. Import données historiques imprimeurs (PRD-05, optionnel)

**Jour 5 : Historique**
9. Onglet Historique dans la fiche produit
10. Fil chronologique avec AuditLog filtrés
11. Affichage des diffs (ancien → nouveau)

### Critère de validation
Karrame voit les KPIs globaux. Marie voit ses tâches en attente. Pascal voit les commandes avec les délais colorés vert/orange/rouge.

---

## Phase 6 — Import/Export & finitions (3-4 jours)

### Livrables
- Export Excel au format BDD actuelle
- Import Excel BDD (mise à jour batch)
- Contrôle réception par Céline (formulaire + photo)
- Job cron alertes délais
- Polishing UI

### Tâches

**Jour 1 : Export**
1. Bouton "Exporter Excel" sur la liste produits
2. Générer un .xlsx avec les mêmes colonnes que la BDD actuelle
3. Respecter l'ordre des colonnes pour compatibilité

**Jour 2 : Contrôle réception**
4. Formulaire Céline : statut réception + notes + upload photo
5. Transition RECEIVED → RECEPTION_CONTROLLED
6. Si non conforme → choix du type (texte/couleur/quantité) + retour workflow

**Jour 3 : Cron + alertes**
7. Job quotidien : vérifier les délais dépassés
8. Créer notifications automatiques

**Jour 4 : Polishing**
9. Tests end-to-end du workflow complet
10. Responsive tablet/mobile
11. Corrections UI, performance

### Critère de validation
Le workflow complet fonctionne de bout en bout : import dégustation → fiche → conformité → PDF → BAT → impression → réception → contrôle → ACTIVE. Tous les rôles ont été testés.

---

## Dépendances entre phases

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4
                                                     │
                                          Phase 5 ←──┘
                                             │
                                          Phase 6
```

- Phase 1 nécessite Phase 0 (setup)
- Phase 2 nécessite Phase 1 (produits + fiche)
- Phase 3 nécessite Phase 1 (recette + fiche)
- Phase 4 nécessite Phase 3 (règles métier appelées par les agents)
- Phase 5 nécessite Phase 2 (workflow) + Phase 4 (agents)
- Phase 6 nécessite tout le reste

Phase 3 et Phase 2 peuvent être développées en parallèle si 2 développeurs.
