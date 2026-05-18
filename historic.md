# 📖 Historic — Journal des décisions & réparations importantes

> Ce fichier trace les actions clés, réparations et réflexions importantes du projet Gaia.
> À compléter sur instruction de David.

---

## 2026-03-08 — Réparation de l'onglet BAT dans `EtiquetteClient`

### Contexte
L'onglet **"BAT & Fichiers"** de la fiche étiquette (`/etiquettes/[id]`) avait été transformé en zone d'upload d'image (Marie pouvait y charger une image PNG/JPG pour analyse vision IA). Ce n'est **pas le bon workflow** : les BAT sont déposés par **Fabrice** dans Minio, pas uploadés par Marie.

### Workflow réel (rappel)
1. Marie crée/valide une fiche étiquette
2. Fabrice reçoit le dossier et produit les fichiers BAT (PDF, AI)
3. Fabrice **dépose les fichiers dans Minio** dans le dossier correspondant au `codePf` du produit (ex: `mt265/`)
4. Marie **visualise les BAT** dans l'onglet dédié pour validation
5. Si besoin, Marie peut déclencher une **analyse IA Vision** sur un fichier BAT existant

### Ce qui avait été cassé
- L'onglet BAT affichait une **dropzone d'upload** (mauvais)
- Les `pdfFiles` passés par `page.tsx` (récupérés depuis Minio via `findFileKeysByPrefix`) n'étaient jamais utilisés
- L'uploader attendait une image (PNG/JPG/WEBP) au lieu d'afficher des PDF Minio

### Solution appliquée
- **Suppression** de la dropzone et de tous les states associés (`batImageFile`, `batImagePreviewUrl`, `handleBatImageSelect`, `runVisionAudit`)
- **Remplacement** par un **viewer 2 colonnes** :
  - Colonne gauche : liste des fichiers Minio reçus (cliquables, avec indicateur actif)
  - Colonne droite : **iframe embarquée** pour visualiser le PDF directement dans l'interface (ou `<img>` pour les images)
- **Bouton "Analyser avec l'IA"** dans la colonne gauche pour déclencher `runVisionAuditFromUrl()` sur le fichier actif
- État vide : message clair indiquant le dossier Minio attendu (`codePf`)

### Fichiers modifiés
- `src/app/(dashboard)/etiquettes/[id]/EtiquetteClient.tsx`

### Réflexion
L'interface est désormais un **outil de travail** (Marie voit immédiatement le BAT sans quitter la page) plutôt qu'un formulaire d'upload. L'analyse IA Vision reste disponible mais en action secondaire sur les fichiers existants.

---

_< entrées suivantes à venir >_
