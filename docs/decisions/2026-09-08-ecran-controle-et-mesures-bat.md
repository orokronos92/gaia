# Reprise de session — écran de contrôle et mesures sur le BAT

**Date** : 8 septembre 2026
**Branche** : `gaia_eta` (partie de `gaia_epsilon` à `7e326b3`)
**État** : 10 commits **locaux, non poussés**. Arbre propre. Déployé sur le VPS.
**Tests** : 217, tous verts. Build OK.

---

## 1. Où en est le produit

L'écran d'audit d'une étiquette est devenu **un seul écran** : la checklist des
39 points à gauche, l'étiquette à droite, collante, zoomable, avec les zones
mesurées surlignées. L'onglet « BAT & Fichiers » n'existe plus.

Marie peut désormais **agir** : cocher un point vérifié, ou assumer une
dérogation motivée sur une non-conformité prouvée. Ses décisions sont stockées
et se périment d'elles-mêmes si le constat change.

Le contrôle est **gratuit** : il lit les BAT (poppler), mesure tout ce qui se
mesure, et ne consomme aucun jeton. Le bouton « Analyse IA » n'ajoute que ce
qu'un modèle fait mieux — reconnaître un dessin, juger une équivalence de sens.

---

## 2. Ce qui a été livré aujourd'hui

| Commit | Contenu |
|---|---|
| `2c9f7fc` | Verdict de checklist à 4 états, lu sur l'action restante |
| `26f245d` | Pont entre les 3 repères de coordonnées d'un BAT, vérifié par le rendu |
| `036dfb2` | Écran unique : liste + visionneuse, fusion des deux onglets |
| `a023c05` | Clic sur une ligne → cadrage et surlignage sur l'étiquette |
| `d91d032` | Plus de bouton « Supprimer » sur un produit déjà supprimé |
| `06a8966` | Volet collant réparé, anomalies visibles d'emblée, boutons clarifiés |
| `09173d0` | Retrait d'un renvoi vers l'onglet disparu |
| `1e0742f` | F5 mesuré sur tout le catalogue (voir §4) |
| `35aea19` | Six contrôles de plus, lus directement sur l'étiquette |
| `e2be603` | Mode `bat` dans le registre — fin du mensonge « contrôle visuel » |

### Le verdict à quatre états

`overallStatus` prenait le pire statut brut : après avoir tout validé, l'écran
affichait « non conforme » à côté de « 0 anomalie ». Le bandeau lit maintenant
**l'action restante** :

🔴 Non conforme · 🟠 Travail restant · 🟢⚠ **Conforme sous dérogation (n)** · 🟢 Conforme

**Une dérogation n'est pas une conformité.** L'état intermédiaire est délibéré :
la fondre dans du vert effacerait la décision qu'on vient d'enregistrer.
`overallStatus` est intact — la synthèse inter-voies raisonne bien sur le constat.

### Les décisions de la Qualité

Table `validations_controle` (migration `0016`, **appliquée à la main**, cf. §6).
Deux gestes distincts : `VERIFIE` sur une alerte, `DEROGATION` sur un `FAIL`
avec motif **obligatoire**. Le serveur refuse de clore un rouge par une simple
coche.

**Le point délicat est la péremption.** Une décision est attachée au **constat
qu'elle répondait** — `sha256(statut + justification)`. Si le contrôle ne dit
plus la même chose (nouveau BAT), la ligne se rouvre en le disant. Bind sur la
fiche entière aurait effacé ses dix coches à chaque correction demandée par
l'audit ; elle aurait cessé d'en poser.

L'empreinte est **recalculée côté serveur** à chaque écriture, jamais reçue du
client, et sur une base **sans jeton** : les avis de modèle en sont exclus, sinon
une décision humaine se rouvrirait au gré de la variance de Mistral.

### Le pont de coordonnées

Trois repères dans un BAT : mots poppler (haut-gauche, ↓, points), flux de
contenu (espace usager, ↑, points), rendu (haut-gauche, ↓, pixels). En rater un
donne un surlignage plausible et faux — le pire des cas.

`pdf-repere.ts` fait la conversion **à un seul endroit**, et `reperes.ts` la
livre **en fractions de l'image** : le navigateur ne fait aucun calcul de repère.

Les tests ne croient pas l'arithmétique, **ils rendent la région calculée et
regardent dedans** : l'Eurofeuille en sort verte, quatre mots en sortent
contrastés contre un fond perdu à 0,0 d'écart-type.

⚠️ Angle mort déclaré : sur tous les BAT JDG, `CropBox = MediaBox` à l'origine.
La branche « décalage d'origine » est raisonnée mais **non exercée**.

### Le mode `bat`

Dix points étaient déclarés `manual` alors que le code les mesure. Les basculer
en `deterministic` aurait cassé deux fois : la voie A les aurait exécutés sans
exécuteur, **et** la fusion refuse de laisser les preuves du BAT trancher un
point déterministe.

D'où un quatrième mode. Répartition finale :

```
deterministic 16   bat 10   llm 9   manual 4
manual = 10.1 (code-barres vectorisé) · 12.1 · 12.2 (Info-Tri absent) · 13.4
```

Un test épingle cette répartition.

---

## 3. Ce que la mesure a trouvé dans le catalogue

Corpus : **258 BAT / 139 produits**, copiés depuis MinIO (jamais versionnés).

| Constat | Chiffre |
|---|---|
| Eurofeuille reconnue au tracé | 141 faces, **0 faux positif** sur 111 contre-étiquettes |
| **Eurofeuilles sous le minimum légal** | **17** (dont TA7372 à 12,78 × 8,52 mm = 94,7 % du minimum) |
| Eurofeuilles à la taille dérogatoire 9 × 6 mm | 15, sur des faces de 29,6 cm² |
| **Mention de conservation** | **0 / 139** |
| **Adresse fabricant** | **5 / 139** |
| Signe métrologique « ℮ » | 0 / 139 → politique JDG tenue, et démontrable |
| Code-barres lisible en texte | **0 / 139** — dessiné, chiffres vectorisés |
| Cartouche Info-Tri | **0 / 139** |

Les deux mentions manquantes sont devenues **F5 en 🔴** dans `visitegaia1109.md` :
soit le dossier de référence est incomplet, soit c'est une non-conformité à
l'échelle du catalogue. Une réponse de Marie tranche.

---

## 4. Ce qui reste ouvert

- **Pousser `gaia_eta`** — 10 commits locaux, jamais poussés.
- **Le bandeau « Conformité globale »** (`audit-synthese.tsx`) lit encore
  `overallStatus` : il contredira le bandeau corrigé juste en dessous. Trois
  options proposées à Ouro, il penche pour le supprimer — **non tranché**.
- **Responsive** : `max-w-7xl` (1280 px) sur le `<main>` du layout bride l'écran
  sur grand écran. L'élargir touche toutes les pages → décision d'Ouro.
- **Code étiquette** non proposé en un clic : `codeEtiquette` n'est pas dans la
  liste blanche des champs éditables, et c'est une colonne `unique`.
- **`poids_net` NULL** sur TA7372 après import : neutralise 6.2 et 1.4 tant que
  Marie ne clique pas la proposition.
- **10.1 / 12.1 / 12.2 / 13.4** : décodage des barres, empreinte du Triman.
- **L'audit BAT n'a toujours pas été validé de bout en bout sur mistral-medium**
  par Ouro (il consomme bien : ~2 030 jetons mesurés, tracés dans `usage_ia`).

---

## 5. Pièges connus, à ne pas redécouvrir

**`overflow-hidden` tue `sticky`.** Il était sur la racine du layout dashboard.
Les halos décoratifs ont maintenant leur propre cage. Ne pas le remettre.

**`pdftoppm` de ce poppler n'écrit jamais sur stdout** — toujours un fichier,
d'où `-singlefile` et un temporaire.

**La contre-étiquette JDG est du texte clair sur fond sombre.** Mesurer la
« part d'encre » n'y veut rien dire ; utiliser la variance de luminance.

**Poppler rend « noir*, » avec sa virgule** là où la fiche écrit « noir* ».
Comparer sans retirer la ponctuation de bord ne retrouve jamais un ingrédient.

**Le journal `drizzle.__drizzle_migrations` est vide** alors que la base est à
jour : tout a été appliqué par `drizzle-kit push`. La migration `0016` a donc été
passée à la main avec `psql`. Ne pas lancer le runner de migrations tel quel.

**Le premier démarrage après un `docker compose build` plante une fois**
(`Cannot find module 'typescript'`), installe TS au runtime, puis redémarre.
Un 502 pendant 30 s après un déploiement est normal.

---

## 6. Comment reprendre

```
git branch --show-current     # gaia_eta
npx vitest run                                            # 217 tests
cd /docker/gaialabel && docker compose build app && docker compose up -d app
```

Fiche de travail : `/etiquettes/dbe4fc8c-8ae2-4ba5-b406-156ad6e32dd7` (TA7372,
produit actif). Les deux archivés portent le code `TA737`.
