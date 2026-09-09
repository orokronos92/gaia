# Diagnostic post-correction — nom_latin après import de TH511

> Lecture seule (SELECT + grep). Aucune modification, aucun commit.
> Contexte : lots 1 (nom_latin → text) et 2 (garde-fou longueur) déployés. L'import de TH511 fonctionne. On vérifie la donnée écrite et sa visibilité, le prompt d'extraction n'ayant PAS été corrigé.

---

## 1. Contenu réel de `nom_latin` après import

**Le champ contient la liste complète des ingrédients latinisés — donnée PARASITE, pas un nom d'espèce.**

Valeur en base pour TH511 (`SELECT nom_latin FROM produits WHERE code_pf='TH511'`) :

```
menthe odorante (Mentha rotundifolia), pétales de souci (Calendula officinalis),
feuille de framboisier (Rubus idaeus), pétales de tournesol (Helianthus annuus),
feuille de noisetier (Corylus avellana), origan (Origanum vulgare),
camomille (Matricaria chamomilla), pétales de bleuet (Centaurea cyanus),
pétales de rose (Rosa damascena)
```

- **Longueur : 335 caractères.**
- C'est **exactement** la valeur qui provoquait le crash `22001` avant le lot 1. Le crash a disparu (colonne `text`), mais **la donnée écrite reste parasite** : l'IA met la liste d'ingrédients dans `nom_latin` au lieu du nom latin de l'espèce.

**Horodatage confirmant l'origine :** TH511 a `cree_le = 2026-03-05` (seed initial) mais `mis_a_jour_le = 2026-07-29 13:58` → l'import récent a fait un `onConflictDoUpdate` (résolution *overwrite*) sur le TH511 existant et a écrit ces 335 caractères. Sans le lot 1, cet upsert aurait planté ; il passe désormais, mais écrit la valeur parasite.

**Conclusion §1 :** le lot 1 a bien supprimé le crash, mais **n'a pas corrigé la sémantique**. `nom_latin` est rempli avec la liste d'ingrédients. C'est cohérent avec le fait qu'on n'a volontairement pas touché au prompt d'extraction.

---

## 2. Ce champ est-il affiché à Marie ?

**OUI — visible en LECTURE et en ÉDITION, sur la fiche produit.** Marie verra donc la valeur parasite.

Chaîne de rendu :

- **Requête** : `page.tsx:75` → `nomLatin: produits.nomLatin` (remonté dans `labelData`).
- **Passage** : `EtiquetteClient.tsx:925` → `nomLatin={labelData.nomLatin}` (transmis au dossier complémentaire).
- **Lecture** : `src/components/recette/DossierComplementaire.tsx:177-179` — bloc affiché si la valeur est non vide, label **« Nom latin »**, rendu **en italique** via `ChampTrace` (provenance `EXTRAIT`) :
  ```tsx
  {hasVal(props.nomLatin) && (
    <ChampTrace label="Nom latin" provenance="EXTRAIT" source={props.nomLatin!}>
      <span className="italic">{props.nomLatin}</span>
  ```
- **Édition** : `src/components/recette/dossier-edit-form.tsx:54` — `ChampInput label="Nom latin"`.

**Emplacement** : carte « Dossier complémentaire » (données PMI étendues : `floId`, `nomLatin`, `dateMiseMarche`).

**Conséquence :** la liste latinisée de 335 caractères s'affiche telle quelle en italique sous « Nom latin » dans la fiche de TH511. **Ce n'est pas un champ interne** → le recadrage du prompt d'extraction devient **prioritaire** (Marie voit une donnée fausse et devra la corriger à la main, exactement le type de charge cognitive que l'app doit supprimer).

---

## 3. Vérification des commits

**Confirmé : lots 1 et 2 en DEUX commits séparés sur `gaia_gamma`.**

`git log --oneline -5` :
```
c397b83 fix(import): guard varchar length before produits insert      ← LOT 2
a394800 fix(db): widen produits.nom_latin to text to prevent import overflow  ← LOT 1
19ec656 fix(etiquettes): restore full fiche state on version restore
c09a7ad Add files via upload
9540e09 docs: add BAT AI-test coverage report (bilan des tests AI)
```

`git status` :
```
On branch gaia_gamma
Your branch is ahead of 'origin/gaia_gamma' by 2 commits.

Untracked files:
	DIAGNOSTIC_IMPORT_NOM_LATIN.md
	DIAGNOSTIC_MARIE.md
	DIAGNOSTIC_MARIE_2.md
	DIAGNOSTIC_TRACABILITE.md
```

- 2 commits, séparés, sur `gaia_gamma`. ✅
- **Non poussés** : la branche est en avance de 2 commits sur `origin/gaia_gamma`.
- Les 4 fichiers `DIAGNOSTIC_*.md` restent non suivis (hors scope des lots).

---

## Synthèse

| Question | Réponse |
|---|---|
| Contenu de `nom_latin` (TH511) | Liste d'ingrédients latinisés, **335 car., parasite** (pas un nom d'espèce) |
| Crash | Supprimé (colonne `text`) |
| Sémantique | **Non corrigée** — l'IA remplit le mauvais champ |
| Visible par Marie ? | **OUI** — lecture (italique, bloc « Nom latin ») + édition, carte Dossier complémentaire |
| Urgence recadrage prompt | **Élevée** — donnée fausse exposée à l'utilisatrice |
| Commits | 2 commits séparés sur `gaia_gamma`, non poussés |

**Recommandation (non appliquée) :** le chantier « prompt d'extraction » doit cadrer `nomLatin` sur le nom latin de l'espèce principale et router la liste latinisée vers un champ approprié (ou la supprimer de `nom_latin`). C'est désormais du **nettoyage de donnée visible**, pas seulement de la robustesse.
