# Contrôle des BAT par le PDF — répartition code / IA

**Date** : 8 septembre 2026
**Constat de départ** : l'audit visuel actuel produit cinq verdicts
« présent / absent / incertain » rendus par un modèle qui a déjà halluciné un
logo, et trois faux avertissements causés par notre propre extracteur.
**Ce que les fichiers permettent** : la mesure exacte.

---

## 1. Ce que contient réellement un BAT — vérifié sur TA7372

Les BAT sont des PDF d'impression produits par **Adobe Illustrator 29.0**. Ils
portent, en clair ou décompressable :

| Donnée | Où | Vérifié |
|---|---|---|
| Zone de coupe (TrimBox) et fond perdu (BleedBox) | catalogue de page | ✅ 55 × 95 mm et 55 × 135 mm |
| Corps exact de chaque texte | flux de contenu, `Tf` + `Tm` | ✅ 7 pt, 15 pt, 5 pt |
| Nom réel de chaque police | descripteur de police | ✅ 9 polices, toutes embarquées |
| **Hauteur de x** et hauteur de capitale | `/XHeight`, `/CapHeight` | ✅ déclarées pour les 9 |
| Position de chaque mot au millième de point | `pdftotext -bbox` | ✅ |
| Rotation d'un texte | matrice `Tm` | ✅ le code étiquette est à 90° |
| Couleurs, y compris Pantone | `/Separation` | ✅ 1 déclarée |
| Calques Illustrator | `/OCProperties` | ✅ 1 |

**Aucune image matricielle** : tout est vectoriel. La géométrie est donc exacte,
jamais approximée par un rendu.

### Deux corrections que ça impose

**Le « M » manquant n'était pas dans le PDF.** Poppler lit
« Malin comme un chimpanzé » en entier, police `JardinsGaia-Script` 18 pt. Nos
avertissements sur la dénomination introuvable venaient de `pdf2json`, pas de
l'étiquette.

**Les convertisseurs arrondissent.** `pdftohtml` annonce un corps de 11 à son
zoom par défaut là où le flux dit 7 pt. Pour un seuil au centième de
millimètre, il faut lire `Tf` et `Tm` — pas un outil de conversion.

---

## 2. Ce que le code peut trancher seul

Tout ce qui suit est **déterministe, reproductible, sans jeton consommé**, et
chaque verdict cite un paragraphe.

### 2.1 Géométrie et typographie

| Contrôle | Règle | Donnée |
|---|---|---|
| Surface de la face la plus grande | §12, §2.3, §10.2 | TrimBox, maximum des faces |
| Hauteur de x des mentions obligatoires | §12 — 0,9 mm ou 1,2 mm selon surface | `XHeight` × corps |
| Hauteur des chiffres du poids net | §4 — 2 / 3 / 4 / 6 mm selon grammage | `CapHeight` × corps |
| Graisse et style | §3.1 allergènes en gras, §11.1 demeter en gras italique | nom de la police |
| Dimensions d'un logo une fois localisé | §11.1 Eurofeuille ≥ 13,5 × 9 mm ; §10.1 Triman ≥ 1 × 1 cm | boîte englobante |

Sur TA7372 : face la plus grande **74,3 cm²** → tranche 25–80 cm² → seuil
**0,9 mm**. Liste d'ingrédients en `MrEavesXLSanOT-Reg` 7 pt, `XHeight` 432 →
**1,07 mm**. Conforme, avec 19 % de marge. Le produit est à 5,7 cm² du seuil qui
ferait passer l'exigence à 1,2 mm — un écart qu'aucun œil ne tranche.

### 2.2 Texte et position

- **Présence et exactitude** de chaque mention : dénomination, ingrédients,
  conservation, adresse fabricant, `FR-BIO-01`, `Agriculture UE/non UE`,
  code étiquette, DDM/lot.
- **Cohérence BAT ↔ fiche** : chaque valeur déclarée est-elle imprimée, et
  à l'identique.
- **« Même champ visuel »** (§1, §11.1) : comparaison de coordonnées, plus un
  jugement humain.
- **Origine sous le code OC, lui-même sous l'Eurofeuille** (§8.1) : trois
  positions à ordonner.
- **Le « e » métrologique absent** (§9) : recherche de caractère.

### 2.3 Ce que ça change pour Fabrice

Les mêmes contrôles, lancés **avant** l'envoi à Marie, répondent en quelques
secondes : titre absent, liste d'ingrédients sous le seuil, allergène pas en
gras, mention de conservation oubliée. C'est l'auto-contrôle qui aurait rattrapé
l'étiquette partie sans titre.

---

## 3. Ce qui reste à l'IA, et rien d'autre

**Reconnaître un dessin.** Le PDF ne dit pas qu'une forme vectorielle *est*
l'Eurofeuille. Ni sa géométrie, ni ses couleurs ne portent ce sens. Cinq logos
sont concernés : Eurofeuille, Triman, Info-Tri, Point Vert, WFTO.

**Juger une équivalence de sens** sur du texte libre :
- l'allégation santé (§3.2) — la fiche dit « Tonifiant », le BAT « STIMULANT & TONIQUE » ;
- la dénomination légale objective (§1.0) ;
- la justification des labels non officiels (§11.2) ;
- les six cas de dénomination aromatisée (§1.2), qui demandent d'interpréter la
  nature de l'aromatisation.

**Le principe ne change pas** : le modèle perçoit ou interprète, le code juge la
conformité. Ce qui change, c'est le périmètre — l'IA cesse de faire ce que la
mesure fait mieux.

---

## 4. Une piste à prototyper, pas à promettre

Les logos sont des artworks **fixes**, identiques d'une étiquette à l'autre. Une
empreinte géométrique de leurs tracés permettrait de les reconnaître **sans IA**,
après une identification humaine unique par logo. Le PDF de TA7372 ne contient
aucun XObject de formulaire — les tracés sont posés en ligne dans le flux — donc
l'isolement d'un logo demande d'abord une segmentation.

À mesurer avant d'y croire. Si ça marche, la détection de pictos devient
déterministe et le dernier usage de vision disparaît.

---

## 5. Prérequis : remplacer `pdf2json`

`pdf2json` perd des glyphes, ne donne pas le nom réel des polices, ne donne pas
les corps, et a déjà provoqué des avertissements faux. **Poppler** (installé) le
remplace sur tous les points, et le flux de contenu se lit avec `zlib` seul.

Un seul consommateur existant : l'ingestion RAG. La bascule est isolée.

⚠️ Le commentaire de `pdf-text.ts` documente une erreur `toUnicode.indexOf` qui
échappait en rejet non capturé. Ce garde-fou disparaît avec la bibliothèque.

---

## 5 bis. P1 livré — 8 septembre

`src/lib/utils/pdf-bat.ts` lit un BAT : zone de coupe, texte, boîtes, corps
exacts, polices et métriques. `pdf-text.ts` passe sur poppler et garde sa
signature — les trois consommateurs (audit BAT, import, RAG) sont inchangés.

Mesuré sur TA7372 : 81 % et 88 % des mots reçoivent leur corps et leur police.
Les manquants sont des mots isolés de texte décoratif (« € », « à », « la ») ;
toutes les mentions obligatoires sont couvertes.

Deux points d'attention :

- **`poppler-utils` a dû être ajouté au Dockerfile**, qui vit dans
  `/docker/gaialabel/` — **hors du dépôt git**. La construction dépend donc d'un
  fichier non versionné : un clone neuf ne se construirait pas correctement. À
  traiter (le `docker-compose.yml` est dans le même cas).
- Le BAT servant de témoin de test n'est **pas versionné** (`.gitignore`) : c'est
  un artwork du client. Les tests concernés se désactivent proprement s'il est
  absent.

---

## 6. Découpage proposé

| Lot | Contenu | Dépend de |
|---|---|---|
| **P1** | Extracteur PDF poppler : texte, positions, corps exacts, polices, métriques, TrimBox | — |
| **P2** | Rattacher les contrôles BAT aux points de la checklist (`checklistId`) | — |
| **P3** | Surface de la face la plus grande → pilote §12, §2.3, §10.2 | P1 |
| **P4** | Hauteur de x et hauteur des chiffres → §12, §4 | P1, P3 |
| **P5** | Graisse et style → §3.1, §11.1 | P1 |
| **P6** | Positions relatives → §1, §8.1, §11.1 « même champ visuel » | P1 |
| **P7** | Écran Fabrice : auto-contrôle avant envoi à Marie | P1-P6 |
| **P8** | Prototype d'empreinte vectorielle des logos | P1 |

**P1 et P2 d'abord.** P1 supprime la cause des faux avertissements ; P2 fait que
l'audit BAT remplisse la liste de travail de Marie au lieu d'ouvrir une seconde
liste à côté.

---

## 7. Ce que ça vaut

Aujourd'hui : cinq verdicts « oui / non / peut-être » d'un modèle écarté en juin,
et des faux avertissements dus à notre extracteur.

Après : une dizaine de contrôles **mesurés**, chacun opposable — *« liste
d'ingrédients en 7 pt, hauteur de x 1,07 mm, seuil 0,9 mm pour une face de
74,3 cm², conforme »* — et l'IA réservée à la seule chose qu'elle fait mieux que
la mesure : reconnaître un dessin.
