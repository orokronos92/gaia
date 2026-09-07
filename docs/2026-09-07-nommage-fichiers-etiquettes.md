# Association produit ↔ étiquette : constat et règles à établir

**Date** : 7 septembre 2026
**Rédigé par** : SPC, à partir des données réelles de l'échantillon GaïaLabel
**Destinataires** : Les Jardins de Gaïa — Direction, Qualité, Graphisme

> Ce document part d'une anomalie constatée en test. Il montre qu'elle n'est pas
> un incident isolé mais la conséquence d'une absence de règle, et propose les
> règles qui la rendraient impossible.
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

C'est le point important pour la suite : **le défaut logiciel est né d'un défaut
de convention.** Nous avons corrigé le premier ; le second ne peut être corrigé
que par JDG.

---

## 4. Ce que dit l'échantillon

### 4.1 Le code article n'a pas de forme stable

Le dossier porte le code de base, la base produit y ajoute un chiffre :

| Base produit | Dossier | Produit |
|---|---|---|
| `TA6122` | `TA612 - LA BALADE DU HÉRISSON` | La balade du hérisson |
| `TH1502` | `TH150-HIBISCUS` | Hibiscus |
| `TB4016` | `TB401 WHITE MONKEY` | White Monkey |
| `TA7372` | `TA7372 - Malin comme un chimpanzé` | Malin comme un chimpanzé |

Sur 151 produits, **50 correspondent exactement** à un nom de dossier et
**99 correspondent à un chiffre près**. Aucune règle écrite ne dit lequel des
deux cas s'applique.

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

Le dernier chiffre distingue donc des **états** d'un même article — version,
conditionnement, ou les deux selon les cas. **Cette ambiguïté est la racine du
problème** : un même caractère sert à plusieurs choses, et personne ne peut dire
laquelle sans connaître le dossier.

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

Aucune règle informatique ne peut trancher les questions suivantes, parce que
l'information n'existe nulle part :

- **Quelle version fait foi** quand un dossier contient une V5 et une V6.
- **Quel dossier correspond à quel code** quand un article en a deux
  (`TB401 WHITE MONKEY` / `TB401 WHITE MONKEY Boîte 1kg`).
- **Ce que signifie le 4ᵉ chiffre** : version, conditionnement, ou autre.
- **Lequel des deux codes est le bon** quand un dossier en contient deux
  (`ETNA737V5` et `ETCNA7372V5`).

Tant que ces points ne sont pas fixés, chaque nouvelle référence rouvre le
risque.

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

### R4 — Le 4ᵉ chiffre a une seule signification

À définir et à écrire **une fois pour toutes**. Si c'est un numéro de version,
alors il ne doit jamais désigner un conditionnement — et réciproquement. Deux
notions distinctes exigent deux emplacements distincts.

C'est la règle la plus structurante des huit : toutes les autres en découlent.

### R5 — Un conditionnement différent est un article différent

S'il a son propre code article, il a son propre dossier. Sinon, il partage le
dossier de l'article et se distingue par le champ `TYPE` du nom de fichier.

> Le cas `TB401 WHITE MONKEY` / `TB401 WHITE MONKEY Boîte 1kg` doit basculer
> dans l'un ou l'autre de ces deux cas, pas rester entre les deux.

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

1. Que signifie le 4ᵉ chiffre du code article ? Version, conditionnement, autre ?
2. `TA737` et `TA7372` désignent-ils le même article à deux versions ?
3. Que distinguent les préfixes de fichier `ETN` et `ETCN` ?
4. À quoi renvoie le `V5` des noms de fichiers — version d'étiquette, révision
   graphique, millésime ?
5. `TB401 WHITE MONKEY` et `TB401 WHITE MONKEY Boîte 1kg` : un ou deux articles ?
6. `TN2412` et `TN5472` n'ont aucun fichier : BAT manquants, ou codes erronés ?
7. `TH5296` et `TU5226` portent le même nom commercial : est-ce voulu ?
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
