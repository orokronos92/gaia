# PRD-00 — Présentation du projet GaïaLabel

## Résumé exécutif

**GaïaLabel** est un système de gestion des étiquettes pour **Les Jardins de Gaïa**, entreprise pionnière du thé bio et équitable en France, basée à Wittisheim (Alsace). Le système remplace un processus manuel (Word, Excel, mails, Illustrator) par une application web centralisée avec contrôles automatiques et agents IA.

---

## Contexte métier

Les Jardins de Gaïa commercialisent **~800 références** de thés, infusions et plantes. Chaque produit possède une étiquette physique soumise à une réglementation alimentaire stricte (INCO, DGCCRF, labels bio). La création et modification d'étiquettes implique un circuit de validation multi-services qui repose aujourd'hui sur des fichiers éparpillés.

### Le problème

Le process actuel génère :
- Des **erreurs de conformité réglementaire** (allégations santé, % d'ingrédients, dénominations légales) qui exposent l'entreprise à des sanctions DGCCRF
- Des **versions divergentes** entre Word, Excel, mails et fichiers Illustrator — personne ne sait quelle version est "la bonne"
- Des **boucles de correction longues** entre Qualité et Graphisme (non tracées, par mail/annotation PDF)
- Un **contrôle réception faible** (visuel humain sans procédure formalisée)
- Un **goulot d'étranglement Marketing** (58% de respect des délais vs 90% pour les Achats)

### Le process actuel (4 étapes)

```
ÉTAPE 1 — QUALITÉ (Marie)
  Entrées : Fiche dégustation (Word) + Fiche recette (Excel) + PMI (ERP)
  Travail : Vérification réglementaire, transformation recette cuisine → recette étiquette,
            calcul des arrondis, rédaction de la fiche Excel "fil rouge" (~100 champs)
  Sortie  : Fichier Excel transmis au Graphisme
  Durée   : 2-3h le jour J + 1h re-vérification à J+1

ÉTAPE 2 — GRAPHISME (Fabrice)
  Entrées : Fichier Excel de Marie (ex: V6) + mails d'actualisation
  Travail : Création/modification étiquette dans Illustrator, export PDF,
            boucles de correction avec Marie, envoi imprimeur, validation BAT
  Sortie  : PDF étiquette validé + BAT approuvé
  Durée   : ~1/3 du temps de travail

ÉTAPE 3 — ACHATS (Pascal)
  Travail : Commande des étiquettes (quantités / délais / prix)

ÉTAPE 4 — CONDITIONNEMENT (Céline)
  Travail : Contrôle réception (étiquette vs BAT, couleurs, quantités)
  Durée   : 1 matinée/mois
  Si non conforme : retour Marie (textes) ou Fabrice (couleurs/impression)
```

---

## Utilisateurs et rôles

| Rôle | Personne | Usage principal | Fréquence |
|------|----------|----------------|-----------|
| `QUALITE` | Marie | Crée/vérifie les fiches étiquettes, valide la conformité, lance les audits IA | Quotidien, 2-3h/produit |
| `GRAPHISME` | Fabrice | Uploade les PDF, consulte les fiches, reçoit les corrections | Quotidien, ~1/3 temps |
| `ACHATS` | Pascal | Crée les commandes d'impression, suit les délais | Hebdomadaire |
| `CONDITIONNEMENT` | Céline | Contrôle les étiquettes reçues, compare avec le BAT | 1 matinée/mois |
| `DIRECTION` | Karrame | Vue globale KPIs, alertes critiques, respect des délais | Consultation |
| `ADMIN` | Victor | Administration technique, paramétrage | Ponctuel |

---

## Objectifs du système

### Objectif 1 — Source unique de vérité
Remplacer les fichiers dispersés (Word + Excel + mails + PMI) par une base de données centralisée avec versioning. Chaque donnée n'existe qu'à un seul endroit.

### Objectif 2 — Automatiser les contrôles de conformité
Codifier les règles de la procédure d'étiquetage (PRO-QHS-013) en contrôles automatiques : arrondis, dénomination légale, QUID, allégations santé, labels, réglisse. Détecter les erreurs AVANT qu'elles partent en graphisme.

### Objectif 3 — Digitaliser le workflow de validation
Remplacer les mails et annotations PDF par un circuit de statuts tracé, avec commentaires, notifications, et permissions par rôle.

### Objectif 4 — Agents IA pour les contrôles complexes
Audit réglementaire global, comparaison Excel↔PDF champ par champ, détection d'incohérences visuelles, comparaison BAT↔étiquette reçue.

### Objectif 5 — Gain de temps pour Marie
Le premier livrable visible : Marie uploade les documents du comité de dégustation (Word + Excel) et obtient une fiche étiquette pré-remplie en quelques minutes au lieu de 2-3h de travail manuel.

---

## Données existantes (à importer)

### BDD Étiquettes principale
- **802 produits × 101 colonnes** (fichier `BDD_étiquettes_2025_extrait_dec_2025.xlsx`)
- Contient : identité produit, labels, textes commerciaux FR/EN, listes d'ingrédients, allégations, paramètres infusion, codes EAN, données multilingues (DE, IT, NL), historique

### Fiches recette
- Format Excel `ENR-PRO-023` (ex: `MT165_MATE_SPORTIF.xlsx`)
- Contient : code article, ingrédients avec codes MP, quantités en kg, % bruts, % arrondis pour étiquette, labels par ingrédient

### Fiches dégustation
- Format Word (ex: `FD_-_MT265_Maté_sportif_v0.docx`)
- Contient : infos PMI, résultats dégustation, liste d'ingrédients rédigée, allégations, labels, gamme/conditionnement

### Traçabilité imprimeurs
- 283 commandes (fichier `TRACABILITE_DELAIS_IMPRIMEURS_QHSE.xlsx`)
- Contient : n° commande, fournisseur, dates par étape, délais cibles vs réels

### Procédure d'étiquetage
- Document `PRO-QHS-013` — référentiel réglementaire complet avec toutes les règles à codifier

---

## Contraintes techniques

- **Hébergement** : auto-hébergé (Docker Compose sur VPS)
- **Nombre d'utilisateurs simultanés** : 5-6 maximum
- **Volume** : ~800 produits, ~50-100 modifications/créations par an
- **Langues des étiquettes** : FR, EN, DE, IT, NL
- **Navigateurs** : Chrome, Firefox (desktop). Safari mobile pour Céline (tablette au conditionnement)
- **API externe** : Anthropic Claude pour les agents IA
