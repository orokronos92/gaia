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

**La géométrie est vectorielle**, donc exacte, jamais approximée par un rendu.
(Nuance mesurée depuis sur 258 BAT : la face avant de TA7372 porte aussi une
image matricielle — un QR code de 200 × 200 px posé en 12,8 mm — et 165
XObjects existent sur le corpus. Les logos, eux, restent vectoriels.)

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

## 5 ter. P3 et P4 livrés — 8 septembre

`src/lib/audit/visual/typographie.ts` mesure, et l'audit BAT verse ces mesures
dans la liste de travail de Marie.

**P3 — surface de la face la plus grande.** Prise sur la zone de coupe, jamais
sur la page (qui inclut le fond perdu). Elle pilote trois choses : le seuil de
hauteur de x (§12), la liste des mentions réellement exigibles sous 10 cm², et
l'exemption d'étiquetage nutritionnel sous 25 cm² (§2.3, point 4.1) — cette
dernière n'est émise que lorsqu'elle s'applique, pour ne rien ajouter au bruit.

**P4 — hauteurs.** La hauteur de x des mentions obligatoires (point 14.1) et la
hauteur des chiffres du poids net (point 6.2), toutes deux calculées :

> métrique/1000 × corps(pt) × 25,4/72

Les deux points étaient déclarés `manual`, « à vérifier à l'œil ». Ils sont
maintenant chiffrés et opposables.

### Mesuré sur TA7372

| Mention | Police | Corps | Hauteur | Seuil | Verdict |
|---|---|---|---|---|---|
| Dénomination | AntoniaVariable | 14 pt | 2,371 mm (x) | 0,9 mm | conforme |
| Liste d'ingrédients | MrEavesXLSanOT-Reg | 7 pt | 1,067 mm (x) | 0,9 mm | conforme, marge 0,167 mm |
| Quantité nette | MrEavesModOT-Reg | 15 pt | 1,804 mm (x) | 0,9 mm | conforme |
| « 100g » | MrEavesModOT-Reg | 15 pt | **3,175 mm** (capitale) | **3 mm** (100 g) | conforme, marge 0,175 mm |

Face la plus grande : 74,25 cm² → tranche 25–80 cm².

### Trois corrections que la mesure a imposées

**Les polices de la face avant étaient invisibles.** Depuis PDF 1.5, Illustrator
range les descripteurs de police et les ressources de page dans des flux
d'objets (`ObjStm`) compressés : rien n'en paraît dans le fichier brut. Le
rattachement des polices sur la face avant était de **0 %** — donc aucune mesure
possible. `lireObjets` décompresse ces flux ; le rattachement passe à 88 % sur la
face avant et 81 % sur la contre-étiquette, à égalité avec les corps.

**`/CapHeight` n'était jamais lu.** L'ordre des clés d'un dictionnaire PDF est
libre : la hauteur de capitale précède le nom de police, la hauteur de x le
suit. On lisait en aval du nom seulement. Sans elle, §4 était indécidable.

**Un mot homonyme n'est pas la mention.** « figue » figure dans la liste
d'ingrédients *et* dans le texte marketing en petit corps. Mesurer n'importe
quelle occurrence aurait produit une non-conformité imaginaire. On ne mesure que
les fenêtres de lecture où les mots d'une mention se concentrent — et, dans ces
fenêtres, toutes les occurrences comptent, puisque le seuil doit être tenu
partout où la mention est imprimée.

### Ce que le contrôle refuse de faire

Trois refus, tous délibérés :

- une mention **absente** des faces analysées est signalée comme telle et
  renvoyée à son contrôle de présence — pas comptée deux fois en non-conformité ;
- une mention **partiellement mesurée** (3 mots sur 6) le dit, et le point reste
  à vérifier : le mot non mesuré pourrait être plus petit que celui qu'on annonce ;
- sans zone de coupe, **aucun seuil n'est déterminable** — et on le dit, plutôt
  que de retenir une surface de page qui inclurait le fond perdu.

Le point 6.2 reste en `VERIFIER` même quand la hauteur passe : le même
paragraphe §4 exige aussi que la quantité nette figure dans le même champ visuel
que la dénomination, ce que seul P6 mesurera.

⚠️ Le témoin de test de la face avant — le seul cas à flux d'objets — n'est pas
versionné (artwork client). Les tests couvrent la logique sur des BAT
synthétiques ; la lecture des `ObjStm` n'a pas de test de non-régression.

---

## 5 quater. P5 et P6 livrés — 8 septembre

`style-typo.ts` et `positions.ts` complètent la mesure : après la taille des
caractères, la façon dont ils sont imprimés et l'endroit où ils sont posés.
`controles-bat.ts` compose les trois familles en un seul point d'entrée.

**P5 — graisse et style.** Chaque police embarquée déclare `/FontWeight`,
`/ItalicAngle` et `/Flags` : la graisse et l'italique se lisent, ils ne
s'estiment pas. Deux contrôles en découlent :

- **§3.1, allergène mis en évidence** (point 5.1). La référence n'est pas « gras
  dans l'absolu » mais « distinct du reste de la liste » : on compare la police
  de l'allergène à celle qui domine la liste d'ingrédients, car une liste
  entièrement en gras ne mettrait rien en évidence.
- **§11.1, le mot « demeter » en gras italique** (point 2.4), émis seulement
  quand le mot figure sur l'étiquette ou que la recette porte un ingrédient
  Demeter — la certification se lit sur les lignes de recette, jamais sur le
  produit.

**P6 — positions relatives.** Le « champ de vision » de l'INCO (art. 2.2.k) est
l'ensemble des surfaces lisibles d'un seul angle de vue. Sur un BAT — un fichier
par face — cela se traduit sans ambiguïté : *une même page = un même champ
visuel*. Deux contrôles :

- **§1 et §4, dénomination et poids net dans le même champ visuel** (points 1.4
  et 6.2, la même mesure rattachée aux deux points pour que chacun se lise seul) ;
- **§6, origine des matières premières sous le code de l'organisme de contrôle**
  (point 8.1), par comparaison d'ordonnées.

### Mesuré sur TA7372

| Contrôle | Constat |
|---|---|
| §6 origine sous FR-BIO-01 | **1,1 mm en dessous**, sur la face avant — conforme |
| §1/§4 même champ visuel | dénomination et « 100g » sur la contre-étiquette, distants de 79,2 mm |
| §3.1 allergène | non applicable (aucun allergène déclaré) |
| §11.1 demeter | non applicable (produit non Demeter) — aucune ligne ajoutée |

### Trois limites assumées

**Le soulignement n'est pas du texte.** C'est un trait vectoriel posé à côté du
mot, indiscernable des autres traits de l'étiquette. La procédure accepte
« Gras, Souligné » : quand la graisse ne distingue pas l'allergène, on ne conclut
donc pas à la faute — on demande de vérifier le soulignement à l'œil. Prouver
l'absence d'une preuve qu'on ne sait pas lire serait une faute de raisonnement.

**La dénomination légale n'est pas le nom commercial.** La fiche porte
« Malin comme un chimpanzé », l'étiquette porte aussi « THÉ NOIR SAVEUR MIEL
FIGUE ET THYM ». §1 vise la seconde. Le contrôle 1.4 livre donc le constat mesuré
et le dit explicitement, mais ne tranche pas : un PASS y serait faussement
rassurant, un FAIL faussement accusateur. C'est la question ouverte du même nom
dans `visitegaia1109.md`.

**L'Eurofeuille est un dessin.** §8.1 exige l'origine sous le code OC, lui-même
sous l'Eurofeuille. Le code mesure la première relation ; la seconde attend P8 ou
la vision. Le point reste donc à confirmer, mais avec les faits en main.

### Une hypothèse à surveiller

« Une page = une face » tomberait si un BAT arrivait en imposition d'imprimeur,
deux faces sur une même page. Le contrôle donne toujours la face et l'écart en
millimètres, précisément pour que ce cas se voie plutôt que de passer en PASS
silencieux.

---

## 5 quinquies. P7 et P8 livrés — 8 septembre

### P7 — l'auto-contrôle du graphisme

`/controle-graphisme` : Fabrice dépose les faces d'un BAT, choisit le produit, et
reçoit les contrôles mesurés avant d'envoyer quoi que ce soit à la Qualité.
C'est l'écran qui aurait rattrapé l'étiquette partie sans titre.

Trois propriétés délibérées : **aucun modèle appelé** (ni jeton, ni attente, ni
verdict d'IA à relire), **rien n'est écrit** (ni fichier stocké, ni journal, ni
statut de fiche — un brouillon reste un brouillon), et **le contrôle de Marie
reste entier** : l'écran débroussaille, il ne valide pas.

Emplacement provisoire dans le menu principal. Le graphisme aura son espace ;
en attendant, un outil d'auto-contrôle inaccessible ne vaut rien.

### P8 — l'empreinte vectorielle : ça marche

L'hypothèse était qu'un logo, étant un artwork **fixe** reposé à l'identique,
laisse dans le flux de contenu une empreinte géométrique reconnaissable sans IA.
Mesurée sur **258 BAT** du catalogue, elle se vérifie.

**Le principe.** L'Eurofeuille se reconnaît en deux temps, chacun auto-validant :

1. le **feuillage d'étoiles** — un sous-tracé de 22 courbes, empreinte relevée
   sur l'artwork JDG ;
2. le **champ vert qui l'englobe**, retenu par son ratio **1:1,5**, celui du
   drapeau européen. Le manuel officiel en fait *l'unité de mesure du logo* :
   c'est donc lui, et rien d'autre, qui porte les dimensions de §11.1.

Le ratio n'est pas qu'un filtre : il vérifie qu'on a bien attrapé le champ vert
et pas un rectangle voisin. Sans lui, la mesure s'ancrait au hasard — la
première tentative, calée sur « le plus petit rectangle englobant », attrapait
parfois le fond de page et donnait des largeurs de 65 mm.

**Ce que ça donne sur le corpus :**

| | |
|---|---|
| Fichiers analysés | 258 (147 faces avant, 111 contre-étiquettes) |
| Eurofeuille reconnue | **141**, toutes sur une face avant |
| Faux positifs sur contre-étiquette | **0 / 111** |
| Faces avant manquées | 3 sur ~144 (2 sans tracé exploitable, 1 gabarit différent) |
| Champ vert mesuré | **140 / 141** |
| Jetons consommés | **0** |

**Et une trouvaille.** Les dimensions se rangent en familles nettes, ce qui est
la signature d'un système de gabarits :

| Champ vert | Fichiers | Statut |
|---|---|---|
| 13,7 × 9,1 mm | 105 | conforme |
| 16,7 × 11,1 mm | 3 | conforme |
| 9,0 × 6,0 mm | 15 | exactement la dérogation « très petits emballages » |
| **12,8 × 8,5 mm** | **10** | **sous le minimum**, sur des faces de 74,3 cm² |
| 13,4 × 8,9 mm | 3 | sous le minimum de 0,1 mm |
| 12,7 × 8,5 · 13,2 × 8,7 · 11,8 × 7,8 mm | 4 | sous le minimum |

Le minimum légal est 13,5 × 9 mm. **Dix-sept étiquettes sont en dessous sans
relever de la dérogation** — dont TA7372, à 12,78 × 8,52 mm, soit 94,7 % du
minimum. Un écart de 5 % qu'aucun œil ne rattrape et que deux gabarits
d'Illustrator suffisent à expliquer : l'un est calé juste au-dessus du seuil,
l'autre juste en dessous.

Les 15 fichiers à 9,0 × 6,0 mm portent exactement la taille de la dérogation,
sur des faces de 29,6 cm². Le manuel autorise 9 × 6 mm pour les « très petits
emballages » **sans chiffrer ce qu'est un très petit emballage**. Le contrôle ne
tranche donc pas à sa place : il nomme la dérogation et demande qu'elle soit
assumée. → question pour la visite.

**Ce que l'empreinte n'est pas.** Elle décrit **cet artwork-là**. Si les Jardins
de Gaïa redessinent leur Eurofeuille, elle ne correspondra plus — et le contrôle
dira « non reconnue », jamais « conforme ». C'est le bon sens de l'échec : ne pas
reconnaître un dessin n'est pas la preuve qu'il n'y est pas, et le verdict le dit
mot pour mot.

**Une correction au §1 de ce document.** « Aucune image matricielle : tout est
vectoriel » était vrai de la contre-étiquette de TA7372, pas de sa face avant :
celle-ci porte une image de 200 × 200 px posée en 12,8 × 12,8 mm — un QR code.
165 XObjects ont été rencontrés sur le corpus. La géométrie des logos reste
vectorielle, mais l'affirmation générale était trop large.

---

## 6. Découpage proposé

| Lot | Contenu | Dépend de |
|---|---|---|
| **P1** | Extracteur PDF poppler : texte, positions, corps exacts, polices, métriques, TrimBox | — |
| **P2** | Rattacher les contrôles BAT aux points de la checklist (`checklistId`) | — |
| ~~**P3**~~ | Surface de la face la plus grande → pilote §12, §2.3 | ✅ 8 sept |
| ~~**P4**~~ | Hauteur de x et hauteur des chiffres → §12, §4 | ✅ 8 sept |
| ~~**P5**~~ | Graisse et style → §3.1, §11.1 | ✅ 8 sept |
| ~~**P6**~~ | Positions relatives → §1, §4, §6 « même champ visuel » | ✅ 8 sept |
| ~~**P7**~~ | Écran Fabrice : auto-contrôle avant envoi à Marie | ✅ 8 sept |
| ~~**P8**~~ | Empreinte vectorielle des logos — concluant, Eurofeuille livrée | ✅ 8 sept |

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
