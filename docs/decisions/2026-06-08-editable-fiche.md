# Édition & versioning de la fiche — décision d'architecture

> Validé par Ouro le 2026-06-08. Objectif produit : l'appli devient le **référentiel
> unique** (cœur du système JDG), remplaçant Word/Excel/PMI. Donc **tout champ doit
> être éditable, sauvegardable, versionné et tracé** — Marie doit pouvoir intervenir
> partout (son expertise, une décision orale du comité, un changement de législation
> sur les additifs impactant d'anciennes recettes), sur les nouveaux produits ET les
> anciens.

## Décisions
1. **UX = édition par carte.** Chaque carte porte son bouton « Modifier » → champs
   éditables → « Enregistrer ». Granulaire, peu risqué, cohérent avec les cartes
   toujours-visibles (SPEC-03b). Pas de mode global, pas d'inline-par-champ.
2. **Versioning des changements significatifs.** Une modif significative crée un
   snapshot dans `versionsEtiquettes` + une entrée `audit_logs` (qui/quoi/quand/
   pourquoi) + permet le **re-audit**. Historique consultable, comparaison avant/après.
   Indispensable pour la traçabilité réglementaire (bio/Demeter).

## Principe directeur
Ne PAS rendre éditable carte par carte de façon ad hoc. **Poser UNE fois un patron
réutilisable**, puis le dérouler partout. « Tout éditable » = répétition mécanique
d'une brique éprouvée, jamais un big-bang.

## Briques à bâtir (sur l'existant)
On réutilise : provenance SPEC-01 (`ChampTrace`), `audit_logs` (lot E RAG), la table
`versionsEtiquettes` (snapshots), et le patron *éditer→valider→persister* déjà prouvé
par la calculatrice recette.

1. **Patron `EditableCard`** : un mode édition local (toggle Modifier/Enregistrer/
   Annuler) + `react-hook-form` + Zod. Distingue les champs `produits` vs
   `fichesEtiquettes` (deux tables).
2. **Server Actions de persistance** par section : auth + Zod + écriture déléguée à
   `src/db/queries/*` + `writeAuditLog` (diff champ par champ) + `revalidatePath`.
3. **Versioning** : helper qui snapshot la fiche dans `versionsEtiquettes` sur un
   changement significatif (recette, ingrédients, mentions légales, allégation…) et
   permet le re-audit. À définir : "significatif" = explicite (bouton « Nouvelle
   version ») et/ou auto sur certains champs critiques.
4. **Re-extraction** d'un produit existant (relancer l'import sur un nouveau document).

## Déroulé (incrémental)
- **Phase 1 (référence)** : sélection de l'**allégation santé** dans Points de
  Vigilance → persiste `allegationChoisie`/`nbTassesAllegation` → remonte dans
  « Données complémentaires ». Petit, teed-up, établit le patron edit→persist→audit.
- **Phase 2** : généraliser `EditableCard` aux cartes texte (Mentions légales,
  Identité, Textes commerciaux…).
- **Phase 3** : versioning + re-audit (cas législation) + re-extraction des anciens.

## Garde-fous (CLAUDE.md)
Mutations multi-tables → transaction. Queries dans `src/db/queries/` uniquement.
Server Action = `auth()` + `Schema.parse()` d'abord. Mistral only. Ne jamais faire
confiance aux IDs/valeurs client (re-vérifier l'accès).
