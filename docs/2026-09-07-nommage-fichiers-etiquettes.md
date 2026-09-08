# Association produit ↔ étiquette : constat et règles à établir

**Date** : 7 septembre 2026, révisé le 8 septembre
**Rédigé par** : SPC, à partir des données réelles de l'échantillon GaïaLabel
**Destinataires** : Les Jardins de Gaïa — Direction, Qualité, Graphisme
**Documents de référence** : MOP-PRO-029 v.2 (26/01/2023) · PRO-QHS-013 (30/03/2023)

> Ce document part d'une anomalie constatée en test. Il montre qu'elle n'est pas
> un incident isolé mais la conséquence d'un écart entre une convention écrite et
> son application, et propose les règles qui la rendraient impossible.
>
> **Révision du 8 septembre.** La première version de ce rapport posait des
> questions sur la structure du code article. MOP-PRO-029 y répond : le
> quatrième chiffre est le type de conditionnement (§2.1.3), et le GENCODE suit
> une structure définie (§3). Les constats ci-dessous ont été refaits à la
> lumière de ces règles ; les questions déjà tranchées ont été retirées.
>
> **Périmètre.** Les chiffres portent sur l'échantillon chargé dans GaïaLabel au
> 7 septembre 2026 : **151 produits** et **149 dossiers d'étiquettes**. C'est un
> extrait du catalogue, pas son intégralité. Les proportions constatées ont donc
> valeur d'indication, et le nombre absolu de cas à corriger sera supérieur.

---

## 1. Le problème en une phrase

**Rien, aujourd'hui, ne relie formellement un produit à ses fichiers
d'étiquettes.** Le lien est deviné à partir de la ressemblance entre un code
produit et un nom de dossier. Quand les noms se ressemblent trop, la devinette
se trompe — sans rien signaler.

---

## 2. L'anomalie constatée

Le 6 septembre, un audit d'étiquette lancé sur le produit **TA737 — Malin comme
un chimpanzé** a analysé **quatre faces** :

```
ETCNA7372V5 - MALIN COMME UN CHIMPANZÉ.pdf     ← le bon produit
ETNA737V5  - Malin comme un chimpanzé.pdf       ← le bon produit
ETCNM7372V5 - LIGHT MY FIRE.pdf                 ← un autre produit
ETNM737V5  - Light my fire.pdf                  ← un autre produit
```

`TM7372 — Light my fire` est un maté, sans aucun rapport avec ce thé. Ses deux
faces ont été intégrées au verdict de conformité de Malin comme un chimpanzé.

**Ce que ça produit concrètement** : le contrôle des logos considère qu'un logo
est présent dès qu'il apparaît sur l'une des faces analysées. L'Eurofeuille
imprimée sur l'étiquette de Light my fire suffisait donc à valider
l'Eurofeuille de Malin comme un chimpanzé — **y compris si elle en était
absente**.

Aucun message d'erreur. Rien à l'écran ne disait d'où venaient les fichiers.

---

## 3. Pourquoi c'est arrivé

Le code produit `TA737` contient la suite `737`. Les fichiers de Light my fire
contiennent eux aussi `737` (`ETNM737V5`). Le rapprochement s'est fait sur cette
seule base, en ignorant le préfixe de gamme — celui-là même qui distingue un
thé (`TA`) d'un maté (`TM`).

Ce mécanisme approximatif n'était pas une négligence isolée : **il avait été
écrit pour compenser l'irrégularité des noms**. Comme aucun code produit ne
correspondait de façon fiable à un nom de dossier, la recherche avait été
élargie jusqu'à retrouver quelque chose — au prix de retrouver aussi ce qu'il ne
fallait pas.

C'est le point important pour la suite : **le défaut logiciel est né d'un écart
entre la convention écrite et son application.** La convention existe pourtant, et
elle est claire — c'est le nommage des dossiers qui s'en éloigne.

---

## 4. Ce que dit l'échantillon

### 4.1 Les dossiers ne portent pas le code complet

Le code article est parfaitement défini par MOP-PRO-029 : famille, numéro
d'article sur trois chiffres, puis conditionnement. La base produit le respecte.
**Les noms de dossiers, eux, omettent le plus souvent le conditionnement :**

| Base produit | Dossier | Produit |
|---|---|---|
| `TA6122` | `TA612 - LA BALADE DU HÉRISSON` | La balade du hérisson |
| `TH1502` | `TH150-HIBISCUS` | Hibiscus |
| `TB4016` | `TB401 WHITE MONKEY` | White Monkey |
| `TA7372` | `TA7372 - Malin comme un chimpanzé` | ✅ code complet |

Sur 151 produits, **50 seulement** trouvent un dossier au nom exact ; **99**
n'y parviennent qu'en retirant le chiffre de conditionnement. C'est ce qui oblige
l'application à rapprocher par ressemblance au lieu de lire un code.

### 4.2 Trois séparateurs coexistent

Sur 149 dossiers : **112 avec une espace**, **30 avec un tiret**, **7 avec un
tiret bas**.

```
TA612 - LA BALADE DU HÉRISSON      (espace + tiret + espace)
TH150-HIBISCUS                      (tiret collé)
TB371_ETBN371V3 Griffes de Snowview (tiret bas)
```

### 4.3 Le nom du dossier ne dit pas toujours ce qu'il contient

- `BT3542 - POÉSIE EN ROSE` contient `ETTUTO3542 POÉSIE EN ROSE.pdf` — le
  dossier annonce **BT**, le fichier annonce **TO**.
- `TV1126 - Lü Zhen Green Needle Special` contient `TV112_ETVN112V3…` — le
  dossier annonce **TV1126**, le fichier **TV112**.
- `TV1346 JADE DEW` contient à la fois `TV134_…` et `TV1346_…` — deux codes
  différents dans un même dossier.
- `TV113_ETVN113V3FF22 Huang Ya Cha` — le nom du dossier **est** un nom de
  fichier.
- `TUTJ0706 TUTJ0706 Gyokuro` — le code est écrit deux fois.
- `TA7372 - Malin comme un chimpanzé` contient `ETNA737V5` **et**
  `ETCNA7372V5` — deux codes pour le même produit, dans le même dossier.

### 4.4 Les versions ne sont pas exploitables

Les fichiers portent un marqueur de version, mais pas tous et pas de la même
façon. Sur 276 fichiers d'étiquettes :

| Marqueur | Nombre |
|---|---|
| `V5` | 197 |
| `V6` | 42 |
| **aucun** | **21** |
| `V3` | 9 |
| `V7` | 6 |
| illisible | 1 |

**Conséquence directe** : rien ne permet de savoir quelle version fait foi. Si un
dossier contient une V5 et une V6, l'application ne peut pas deviner laquelle est
la bonne — et un contrôle risque de porter sur une étiquette périmée.

### 4.5 Doublons et manques

- **`TN5482 — Perles du Laos` possède deux dossiers** au contenu identique :
  `TN5482 - Perles du Laos` et `TN5482_Perles du Laos`. Seul le séparateur
  change.
- **`TB401 — White Monkey` possède deux dossiers légitimes** (sachet et boîte
  1 kg), mais rien dans le nom ne dit lequel correspond à quel code produit.
- **2 produits n'ont aucun fichier** : `TN2412 — Moon Light Glory`,
  `TN5472 — Noir du Laos`.
- **5 produits n'ont que des fichiers de travail Illustrator, aucun PDF** :
  `TH5296`, `TU5226`, `TU2092`, `TR2472`, `TB720`.
- **Deux produits différents portent le même nom** : `TH5296` et `TU5226` sont
  tous deux « La tisane de Noël ».

### 4.6 Un chiffre porte deux significations

Six codes de base sont partagés par plusieurs produits, et il s'agit à chaque
fois du **même article** :

```
TB401 → TB4016, TB4017        (White Monkey)
TB404 → TB4041, TB4042, TB4046 (Ché Chun)
TU032 → TU0322, TU0326        (Mini Tuocha)
TV657 → TV6572, TV6576        (Gyokuro Premium)
TJ220 → TJ2202, TJ2206        (Matcha pour la cuisine)
MT265 → MT265, MT2652         (Maté sportif)
```

Le dernier chiffre est le **type de conditionnement**, et il est défini noir sur
blanc dans **MOP-PRO-029 §2.1.3** :

| Poids | Code | | Poids | Code |
|---|---|---|---|---|
| 1,5 kg vrac | 1 | | 250 g | 4 |
| 100 g ou ≥ 80 g | 2 | | 500 g | 5 |
| 1 kg Malongo | 3 | | 50 g ou < 80 g | 6 |
| | | | 1 kg Jardins de Gaïa | 7 |

Les six cas ci-dessus ne sont donc **ni des doublons ni des versions** : ce sont
les conditionnements d'un même thé. `TB4016` est le White Monkey en 50 g,
`TB4017` le même en 1 kg.

Vérification sur le catalogue : **131 produits sur 135** portant un chiffre de
conditionnement ont un poids net cohérent avec lui. La règle est donc appliquée,
et elle est fiable.

---

## 5. Le risque, en clair

L'enjeu n'est pas le confort d'utilisation. Un contrôle d'étiquetage sert à
attester qu'une mention réglementaire figure bien sur l'emballage.

Si le contrôle porte sur le mauvais fichier :

- une **mention obligatoire absente** peut être déclarée présente (Eurofeuille,
  Triman, allergènes, mentions INCO) ;
- une **mention interdite présente** peut passer inaperçue (Point Vert) ;
- le contrôle **est archivé comme valide** et fait foi en cas d'audit
  Demeter, WFTO ou Ecocert.

Une erreur de ce type ne se voit pas : elle produit un résultat plausible. C'est
ce qui la rend plus dangereuse qu'une panne.

Le même mécanisme alimente l'affichage : la fiche d'un produit peut présenter à
l'équipe les étiquettes d'un autre.

---

## 6. Ce qui a été corrigé côté application

Trois changements, livrés le 7 septembre.

**1. Le rapprochement est devenu strict.** Il ne compare plus des morceaux de
chiffres mais le code article complet, préfixe de gamme compris. Un `TA` ne peut
plus atteindre un `TM`. L'anomalie décrite au §2 est désormais impossible.

**2. L'application ne devine plus à chaque consultation.** Le lien produit ↔
fichier est **enregistré en base** : 600 liens couvrant 149 des 151 produits.
Chaque lien conserve son origine — proposé automatiquement, ou établi par une
personne. **Une association posée par un humain n'est jamais écrasée.**

**3. La source est affichée.** Le rapport d'audit indique désormais combien de
faces ont été lues et de quel dossier elles viennent. Un fichier inattendu se
voit immédiatement, au lieu de passer sous silence.

**Ce que ces correctifs ne font pas** : ils ne devinent pas mieux. Ils
transforment une devinette invisible en une donnée vérifiable. La justesse
initiale de cette donnée dépend encore de la cohérence des noms.

---

## 7. Ce que l'application ne peut pas résoudre seule

MOP-PRO-029 lève une partie des questions que nous nous posions :

- Le **4ᵉ chiffre** est le type de conditionnement (§2.1.3).
- **Les deux codes d'un même dossier** sont normaux : l'étiquette *facing* peut
  omettre le chiffre de conditionnement, la *contre-étiquette* le porte
  (§2.2.2 et §2.2.3). D'où `ETNA737V5` à côté de `ETCNA7372V5`.

Restent deux points qu'aucune règle informatique ne peut trancher :

- **Quelle version de visuel fait foi** quand un dossier contient une V5 et une
  V6. Le `V<n>` des noms de fichiers n'est décrit dans aucune procédure.
- **Quel dossier correspond à quel conditionnement** quand un article en a deux
  (`TB401 WHITE MONKEY` / `TB401 WHITE MONKEY Boîte 1kg`), les noms de dossiers
  ne portant pas le chiffre de conditionnement.

---

## 8. Règles proposées

Ces règles sont volontairement simples : elles doivent tenir sur une page
affichée près du poste de travail. Elles n'imposent aucun outil nouveau.

### R1 — Un article, un dossier, un nom

Un dossier par article, nommé **exactement** :

```
<CODE_ARTICLE> - <Dénomination commerciale>
```

Un seul séparateur : espace, tiret, espace. Aucun autre code dans le nom.

> ✅ `TA7372 - Malin comme un chimpanzé`
> ❌ `TV113_ETVN113V3FF22 Huang Ya Cha`

### R2 — Le code du dossier est la référence

Le code inscrit dans le nom du dossier est celui de l'ERP. Aucun fichier du
dossier ne porte un code différent de celui-là.

> Aujourd'hui `TA7372` contient un fichier `ETNA737V5` : deux codes, un seul
> article. C'est cette cohabitation qui a rendu l'erreur possible.

### R3 — Un nom de fichier normé

```
<CODE_ARTICLE>_<TYPE>_V<n>.pdf
```

- `TYPE` pris dans une liste fermée à définir ensemble (par ex. `RECTO`,
  `VERSO`, `CARTON`, `SACHET`).
- `V<n>` **obligatoire**, y compris pour une première version (`V1`).
- Le fichier Illustrator porte le même nom, avec l'extension `.ai`.

> ✅ `TA7372_RECTO_V5.pdf` et `TA7372_RECTO_V5.ai`

### R4 — Le nom du dossier porte le code complet, conditionnement compris

MOP-PRO-029 §2.1.3 définit déjà le chiffre de conditionnement. Il suffit de
l'écrire dans le nom du dossier, comme dans l'ERP.

> ✅ `TA7372 - Malin comme un chimpanzé` (100 g)
> ❌ `TB401 WHITE MONKEY` puis `TB401 WHITE MONKEY Boîte 1kg`
> ✅ `TB4016 - White Monkey` et `TB4017 - White Monkey`

Aujourd'hui **148 dossiers sur 149** omettent ou tronquent ce chiffre, alors que
la base produit le porte. C'est ce décalage qui oblige l'application à
rapprocher les fichiers par ressemblance au lieu de lire un code.

### R5 — Un conditionnement = un dossier

Deux conditionnements du même thé ont deux codes article distincts (§2.1.3) :
ils méritent deux dossiers distincts, nommés par leur code complet.

> Le cas `TB401 WHITE MONKEY` / `TB401 WHITE MONKEY Boîte 1kg` se résout de
> lui-même une fois R4 appliquée.

### R6 — Une seule version en vigueur, visible

Les versions périmées vont dans un sous-dossier `_ARCHIVE`. Le dossier principal
ne contient que ce qui fait foi.

### R7 — Pas de doublon de dossier

Un article n'a qu'un dossier. `TN5482` en a deux aujourd'hui : à fusionner.

### R8 — Toute référence a son BAT

Un article sans fichier PDF est signalé, pas ignoré. Sept références sont dans ce
cas dans l'échantillon.

---

## 9. La cible : l'application comme référence

Les règles ci-dessus assainissent l'existant. La solution durable va plus loin :
**que l'association soit établie une fois, dans GaïaLabel, plutôt que déduite
d'un nom de fichier à chaque consultation.**

La base technique est en place depuis le 7 septembre. Il reste à ouvrir l'écran
qui permettra au graphiste de rattacher explicitement un BAT à une fiche et de
désigner la version en vigueur.

Le bénéfice est direct : **le jour où JDG réorganise ses codes, il n'y a plus
qu'un recalage à faire, à un seul endroit** — au lieu d'un logiciel à réajuster
indéfiniment derrière chaque exception.

---

## 10. Questions à trancher avec JDG

*Les questions sur le 4ᵉ chiffre, les préfixes `ETN`/`ETCN` et les deux codes
d'un même dossier ont trouvé leur réponse dans MOP-PRO-029 — elles sont retirées
de cette liste.*

1. À quoi renvoie le **`V5`** des noms de fichiers — version d'étiquette, révision
   graphique, millésime ? Aucune procédure ne le décrit, et **21 fichiers sur 276
   n'en portent aucun**.
2. **17 produits n'ont pas de chiffre de conditionnement** dans leur code
   (`TH200`, `TH440`, `MT265`…). Codes historiques à conserver, ou à compléter ?
3. **Deux EAN sont portés par deux produits différents** :
   `TH5226` La tisane d'hiver et `TH5296` La tisane de Noël partagent
   `3582811005223` ; `TR2092` et `TR2482` partagent `3582810920923`.
   Deux produits distincts ne peuvent pas partager un GTIN.
4. **Quatre produits** ont un conditionnement incohérent avec leur poids net :
   `TJ9051` (code 1 = 1,5 kg, poids 30 g), `BT3542` (code 2, poids « 3 pièces »),
   `TH0632` (code 2 = ≥ 80 g, poids 70 g), `TU0025` (code 5 = 500 g, poids 125 g).
5. `TN2412` et `TN5472` n'ont aucun fichier d'étiquette : BAT manquants, ou codes
   erronés ?
6. `TH5296` et `TU5226` portent le même nom commercial : est-ce voulu ?
7. L'arrondi QUID : **§2.2 dit un chiffre après la virgule**, les fiches recette
   R&D arrondissent autrement (MT265 : 62 / 15,5 / 6 ; TA7372 : 38 / 32 / 19).
   Quelle règle fait foi ?
8. Qui fait foi, à terme : le dossier partagé ou GaïaLabel ?

---

## 11. Ce qu'il faut retenir

- L'anomalie a été **corrigée** dans l'application, et ne peut plus se produire
  sous cette forme.
- Elle est née d'une **absence de règle de nommage**, pas d'un défaut isolé.
- Les données montrent que **l'irrégularité est la norme**, pas l'exception :
  trois séparateurs, deux significations pour un même chiffre, des dossiers qui
  ne portent pas le code de leur contenu.
- Chaque nouvelle référence créée sans règle **rouvre le risque**.
- Le coût d'une règle est faible et immédiat. Le coût d'un contrôle
  réglementaire erroné ne l'est pas.
