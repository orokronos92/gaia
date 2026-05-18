# Synthèse — Atelier de travail étiquettes (Les Jardins de Gaïa) — 27/11 (Wittisheim)

## Contexte & participants
- **Objectif** : sécuriser et moderniser le processus de **création / modification / validation** des étiquettes (nouvelles recettes et mises à jour).
- **Participants (Jardins de Gaïa)** : Direction (Karrame), Qualité (Marie), Graphisme (Fabrice), Conditionnement (Céline), Production/Achats (Pascal), Informatique (Victor).
- **Prestataires** : David Duhamel Consulting (David Duhamel), SPC (Raphaël Kieffer).

---

## Vue d’ensemble du flux (3 étapes)
1. **Qualité (Marie)** : collecte des données, création d’une **fiche Excel “fil rouge”**, contrôles réglementaires et recette.
2. **Graphisme (Fabrice)** : production de l’étiquette (Illustrator → PDF), boucles de correction avec la Qualité, envoi imprimeur, BAT, validation finale.
3. **Achats / Conditionnement (Pascal / Céline)** : commande, réception, contrôles **étiquette vs BAT**, quantités, couleurs, conformité visuelle; retours si anomalie.

---

## Étape 1 — Service Qualité (Marie)
### Sources / données d’entrée
- **Fiche de dégustation (Word)**
- **Fiche recette (Excel)**
- Données complémentaires dans **PMI**
- Éléments / demandes du **graphisme** (Fabrice)

### Contrôles clés (dans la fiche Excel)
- **Conformité réglementaire**
- **Conformité recette** : convertir correctement la recette “cuisine” en recette “réglementaire”
- **Conformité désignation**
- La fiche Excel sert aussi de base à la **fiche technique client**.

### Temps estimé
- Étapes 1 → 3 : **2 à 3 h** le jour J
- Re-vérification : **~1 h à J+1** si tout est OK

### Risques identifiés
- **Recette fausse** (pourcentages / conformité à la norme)
- **Champs manquants** dans la fiche Excel
- **Erreurs dans les champs** constitutifs de l’étiquette (contenus erronés)
- **Incohérences visuelles vs recette** (ex : citron/panda non justifiés)
- **Allégations santé** (détox, drainant, purifiant, etc.) → risque réglementaire

### TO DO (Qualité) — TRÈS IMPORTANT
- **Sécuriser / harmoniser les données d’entrée**
  - Unifier et coordonner le contenu de la **fiche de dégustation Word**
  - Renforcer la **vérification** de la fiche recette Excel
- **Définir une règle d’arrondis**
  - Garantir que la somme des % arrondis = **100%**
  - Définir sur quelles variables on peut “jouer” / pas jouer
- **Contrôler l’actualisation des données**
  - S’assurer d’avoir les **dernières versions** (éviter les vieux mails / vieux fichiers)
- **Réduire / supprimer** les risques listés (checklists / validations)

---

## Étape 2 — Service Graphique (Fabrice)
### Sources / données d’entrée
- **Fichier Excel Marie (V6)**
- Mails d’actualisation (ponctuels)

### Process (résumé)
- Vérifier l’actualisation (nouvelle recette / modification)
- Générer un **nouveau code étiquette** (Illustrator) + sortie **PDF**
- Modifier les champs (contenus), enregistrer PDF
- Envoyer à Marie pour contrôle (PDF annoté si anomalie)
- Envoyer à l’imprimeur, recevoir **BAT**, valider (contenu + Pantone)
- Pour un **renouvellement d’étiquette existante** : le process démarre à l’étape 5 (pas depuis le début)

### Temps estimé
- Environ **1/3** du temps de travail global
- Étape 1 : ~**10 min**
- Étape 3 : **15–20 min**
- Étapes 5–6 : **variable** (boucles + disponibilités Marie/Fabrice)

### Risques identifiés
- Louper une info (info manquante/fause/mal enregistrée/non actualisée)
- Générer un **code déjà existant** (doublon / non actualisé)
- Enregistrer une **mauvaise version** (ancienne version) au moment de sauvegarder

### TO DO (Graphisme) — TRÈS IMPORTANT
- **Pré-contrôle avant retour Qualité**
  - “Formatage” de la conformité étiquette
  - Comparaison **Image (PDF) vs Excel** :
    - Nombre de champs OK
    - Contenu des champs OK
    - Cohérence graphique vs sujet + fiche Excel
- Repenser le mécanisme de **signalement des anomalies**
  - Aujourd’hui : annotation dans le PDF
  - Piste : utiliser l’Excel pour identifier/ancrer l’anomalie et faire le lien avec le PDF

---

## Étape 3 — Achats / Conditionnement (Pascal / Céline)
### Rôle
- **Pascal (Achats/Prod)** : commande les étiquettes (quantités / délais / prix)
- **Céline (Conditionnement)** : réception et contrôles

### Contrôles à réception
- Conformité globale
- Visuel
- Étiquette **vs BAT**
- Couleur
- Quantités

### En cas de non-conformité
- Retour **Qualité (Marie)** : erreurs texte
- Retour **Graphisme (Fabrice)** : couleurs / défauts d’impression

### Temps estimé
- **1 matinée par mois**

### TO DO (Conditionnement) — IMPORTANT
- Renforcer / formaliser le contrôle **Étiquette vs BAT** (procédure + traces)

---

## Points “TRÈS IMPORTANTS” (à retenir)
1. **Une source de vérité unique** pour les données étiquette (éviter versions multiples Word/Excel/mails).
2. **Règles de calcul** des % (arrondis) formalisées + contrôles automatiques (somme = 100%).
3. **Contrôles réglementaires & allégations santé** : zone à haut risque → check systématique.
4. **Contrôle croisé Excel ↔ PDF** standardisé avant validation Qualité.
5. **Gestion des versions** (codes étiquette, PDF, BAT) pour éviter doublons/anciennes versions.
6. **Contrôle réception** (étiquette vs BAT) tracé et exploitable.

---

## Prochaine étape recommandée (orientation)
- Mettre en place un système qui :
  - **Sécurise les entrées** (modèles standardisés + validations)
  - **Centralise** (versioning, statut, historique, qui valide quoi)
  - Facilite la **détection d’écarts** (Excel vs PDF vs BAT) avec checklists + règles
  - Conserve une **traçabilité** (qualité / audit / historique)

