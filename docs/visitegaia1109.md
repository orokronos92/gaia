# Visite Les Jardins de Gaïa — vendredi 11 septembre 2026

> Questions en suspens, classées **par interlocuteur** : on repart avec des
> réponses, pas avec des notes à trier.
>
> Elles s'adressent aux **Jardins de Gaïa**, pas aux personnes. Les noms disent
> qui sait répondre, pas qui décide : un poste change de titulaire, et les
> réponses doivent survivre à ce changement.
>
> Ouvert le 8 septembre. Évolue jusqu'au **jeudi 10 au soir**, arrêt du
> développement pour cette itération.
>
> 🔴 bloque un chantier · 🟠 fausse un résultat · 🟡 à clarifier

---

## Marie Maillot — Qualité

*Rédactrice de PRO-QHS-013. C'est elle qui tranche tout ce qui touche la règle.*

### 🔴 M1. L'arrondi QUID : la procédure et les fiches recette ne disent pas la même chose

PRO-QHS-013 §2.2 énonce : *« un chiffre après la virgule […] si le total est
supérieur à 100 %, l'ajustement se fera sur la matière en quantité la plus
importante »*.

Appliquée à MT265, cette règle donne **99,9 %** — et sa clause de correction ne
couvre que le cas « supérieur à 100 ». La fiche recette, elle, affiche **100 %** :

| | Maté | Gingembre | Guarana | Hibiscus | HE orange | Menthe | Ginseng | Stevia |
|---|---|---|---|---|---|---|---|---|
| **§2.2 littéral** | 62,2 | 15,5 | 6,2 | 6,2 | 3,7 | 3,7 | 1,9 | 0,5 |
| **Fiche R&D** | 62 | 15,5 | 6 | 6 | 4 | 4 | 2 | 0,5 |

Et sur TA7372 la fiche arrondit à l'entier (38 / 32 / 19 / 5 / 4 / 1 / 1) là où
MT265 garde des demis. **Le pas d'arrondi change selon le produit.**

- Quelle règle fait foi ?
- Qui remplit la colonne « % pour liste d'ingrédient » — est-elle calculée ou saisie ?
- Doit-on lire cette colonne plutôt que recalculer ?

*Conséquence directe : l'application affiche aujourd'hui 38,5 / 19,5 / 4,5 / 0,5
sur TA7372 là où la fiche dit 38 / 19 / 5 / 1.*

### 🟠 M2. Deux codes-barres portés chacun par deux produits différents

```
3582811005223   TH5226 La tisane d'hiver   |  TH5296 La tisane de Noël
3582810920923   TR2092 Lumière d'étoiles   |  TR2482 Lumière d'étoiles
```

Deux produits distincts ne peuvent pas partager un GTIN : ils sont
indistinguables en caisse. Erreur de saisie, ou produits qui n'en font qu'un ?

*Aucune des 150 clés de contrôle EAN-13 du catalogue n'est fausse — le problème
n'est pas la construction du code, c'est son affectation.*

### 🟠 M3. Quatre conditionnements incohérents avec le poids net

MOP-PRO-029 §2.1.3 fixe la correspondance. Quatre produits s'en écartent :

| Code | Produit | Chiffre | Attendu | Poids déclaré |
|---|---|---|---|---|
| `TJ9051` | Matcha Tradition | 1 | 1,5 kg vrac | 30 g |
| `BT3542` | Poésie en rose | 2 | ≥ 80 g | « 3 pièces » |
| `TH0632` | La souplesse du dragon | 2 | ≥ 80 g | 70 g |
| `TU0025` | Peace, Love & Tea | 5 | 500 g | 125 g |

Erreurs, ou cas particuliers qui échappent à la règle ?

### 🟡 M4. Dix-sept produits sans chiffre de conditionnement

`MT265`, `TH200`, `TH440`, `TH501`, `TH509`, `TH511`, `TH520`, `TH521`, `TH530`,
`TH540`, `TH577`, `TH701`, `TH974`, `TH208`, `TH209`, `TB720`, `TA737`.

Leur EAN suit d'ailleurs un **format plus ancien** (numéro d'article sur quatre
chiffres, sans conditionnement). Codes historiques à conserver tels quels, ou à
compléter ?

### 🟡 M5. La mention réglisse a deux seuils, notre contrôle n'en connaît qu'un

§3.3 distingue **≥ 10 mg/l** (« Contient de la réglisse ») et **≥ 50 mg/l**
(mention complète avec l'avertissement hypertension). L'application applique la
seconde à tous les produits contenant de la réglisse.

C'est aussi ce que dit votre procédure — *« aux Jardins de Gaïa nous utilisons la
mention pour tous les produits qui contiennent de la réglisse »*. Confirmez-vous
que la simplification est volontaire ?

### 🔴 M9. Deux produits à la réglisse sans l'avertissement hypertension

Lecture du texte des BAT de **119 produits** — ceux dont l'étiquette porte du
texte lisible. **Neuf impriment « réglisse » dans leur liste d'ingrédients, sept
seulement portent l'avertissement.**

| Avertissement | Produits |
|---|---|
| Présent | TH5226 · TF1222 · TA0866 · TF1112 · MT3022 · TM0182 · TA7412 |
| **Absent** | **TH0632** — La souplesse du dragon · **TN4162** — Mémoire d'Everest |

Contrairement à F5, la lecture n'est pas en cause : sept étiquettes portent bien
la mention, deux ne la portent pas.

Deux questions. Ces deux références sont-elles concernées — la réglisse y
dépasse-t-elle le seuil du §3.3 ? Et si oui, les BAT sont-ils à corriger, ou
existe-t-il une version plus récente que le dossier `RÉFÉRENCES ÉTIQUETTES` ne
contient pas ?

À traiter avec M5, qui porte sur les seuils.

### 🟠 M10. Une allégation santé incomplète sur l'étiquette

Le §3.2 impose trois mentions avec une allégation : les valeurs nutritionnelles,
« consommation journalière conseillée : x tasses de 25 cl », et « dans le cadre
d'un mode de vie sain ».

Dix-huit produits en portent au moins une. **Dix-sept portent les trois.**

**TR2072 — « La voie lactée »** imprime les valeurs nutritionnelles, mais ni la
consommation journalière, ni la phrase « mode de vie sain ».

Le produit porte-t-il réellement une allégation santé ? Si oui, l'étiquette est
incomplète. Sinon, pourquoi les valeurs nutritionnelles y figurent-elles ?

### 🔴 M11. Les mentions introuvables sont-elles portées par le sachet pré-imprimé ?

Hypothèse à confirmer, et elle expliquerait plusieurs constats d'un coup : vos
étiquettes sont imprimées puis **collées sur des sachets déjà imprimés**, et ce
sont ces sachets qui portent les mentions que nous ne trouvons jamais sur les
BAT.

| Mention | Retrouvée sur le BAT |
|---|---|
| Conditions de conservation | **0 / 139 produits** |
| Adresse du fabricant | **5 / 139 produits** |
| Cartouche Info-Tri | **0 / 139 produits** |
| Triman | aucune empreinte de tracé sur 45 étiquettes examinées |

**Si l'hypothèse est juste, deux questions suivent.**

*Faut-il que l'application continue de les contrôler ?* Notre recommandation est
oui. Le jour où l'une de ces mentions passe sur l'étiquette, l'application le
voit. Les retirer aujourd'hui obligerait à les réintroduire demain — et la
checklist ne serait plus la transposition exacte de PRO-QHS-013.

*Comment le déclarer ?* Une fois pour toutes par type de conditionnement, ou
produit par produit ? Dans le second cas, c'est 139 produits × 4 mentions à
lever à la main.

**Un détail qui ne colle pas.** Si le sachet porte toujours l'adresse, pourquoi
**5 étiquettes sur 139** l'impriment-elles quand même ? Ces cinq références
ont-elles un autre format d'emballage ?

**Ce que l'hypothèse n'explique pas.** L'avertissement réglisse (M9) figure sur
**7 étiquettes sur 9** concernées : pour cette mention-là, c'est bien l'étiquette
qui la porte, et les deux manquantes restent à expliquer.

À lire avec F5, F8 et M9.

### 🟠 M12. Sur quel support sont imprimés la DDM et le numéro de lot ?

La table du §12 de votre procédure liste la **date de durabilité minimale**
parmi les mentions obligatoires, et cela dans **toutes** les tranches de surface
— y compris sous 10 cm², où les autres mentions peuvent être fournies autrement.

Constat : aucun BAT n'en porte, et l'application n'a **aucun champ** ni pour la
DDM ni pour le numéro de lot.

- Sur quel support sont-ils apposés ? Jet d'encre sur le sachet, sur le tube,
  sur l'étui ?
- Souhaitez-vous que l'application enregistre ce support ?

Tant que ce n'est pas déclaré, l'application ne peut ni les contrôler, ni
expliquer pourquoi elle ne les contrôle pas. Même famille que M11.

### 🟠 M8. Un code fabricant erroné dans un Gencode

`TA6692` porte l'EAN `3585810866925`, dont le code fabricant se lit **8581** au
lieu de **8281**. Un chiffre inversé, mais le code-barres désigne alors une autre
entreprise.

### 🟡 M6. Deux produits portent le même nom commercial

`TH5296` et `TU5226` s'appellent tous deux « La tisane de Noël ». Voulu ?

### 🟡 M7. Température et temps d'infusion : deux notions, un seul champ

La fiche dégustation de TA7372 porte **95 °C / 4 mn** (protocole de dégustation),
le BAT imprime **90 °C / 3 min** (conseil au consommateur). L'import recopie
aujourd'hui le premier dans le champ destiné au second.

Confirmez-vous que ce sont bien deux données distinctes, à ne jamais confondre ?

---

## Aurélie Rohmer — R&D / développement recettes

*Signataire des fiches ENR-PRO-023 et ENR-PRO-024.*

### 🔴 A1. Comment traiter une substitution d'ingrédient

Le classeur TA7372 raconte ceci :

| Version | Descriptif | Raison | Effet |
|---|---|---|---|
| v.1 — 25/09/2023 | modification de la base de thé | utilisation du stock de TN407B | SORWATHE 6 → 5 kg, **+ 1 kg DIAN HONG** |
| v.2 — 08/02/2024 | fin du stock à écouler | retour à la recette d'origine | retour à 6 kg SORWATHE |

Deux thés noirs différents, la liste déclarée reste « Thé noir », le BAT ne bouge
pas. C'est légitime — mais l'application doit savoir le **prouver**.

- La case « incidence sur : ÉTIQUETAGE / DLUO » de la fiche est-elle cochée à
  chaque modification ? Par qui ?
- Existe-t-il des règles écrites de substitution acceptable, ou est-ce au cas par cas ?

### 🔴 A2. Le référentiel matière première — la donnée qui débloque trois chantiers

La recette dit `TN592 SORWATHE OP1`, l'étiquette doit dire `Thé noir`. **Rien ne
relie les deux.** Sans cette correspondance :

- le contrôle d'ingrédients de l'audit échoue sur **chaque** produit ;
- impossible de dire si une substitution change la liste déclarée ;
- impossible de générer les étoiles bio.

**Existe-t-il un export PMI du référentiel matière** (code article → dénomination
légale, bio, Demeter, équitable, allergènes) ? Une cinquantaine de matières
suffirait pour l'échantillon actuel.

### 🟡 A3. L'étoile bio n'est pas dans la fiche recette

PRO-QHS-013 §11.1 impose `*` pour les ingrédients bio et `**` pour les Demeter.
Or la fiche recette n'a **aucune colonne BIO** — elle ne porte que Demeter et
commerce équitable. Nous supposons donc « bio par défaut ».

Sur le BAT de TA7372, `arôme naturel de (figue 5%, miel* 4%)` : le miel a une
étoile, **la figue non**, alors que les deux sont nommés « AROME BIO 2022 » dans
la recette. Qui décide, et sur quelle base ?

---

## Fabrice — Graphisme

### 🔴 F1. Le nom du dossier ne porte pas le code complet

MOP-PRO-029 §2.1.3 définit le chiffre de conditionnement, et la base produit le
respecte. **148 dossiers sur 149 l'omettent.**

```
Base produit  TA6122     Dossier  « TA612 - LA BALADE DU HÉRISSON »
Base produit  TB4016     Dossier  « TB401 WHITE MONKEY »
Base produit  TA7372     Dossier  « TA7372 - Malin comme un chimpanzé »  ✅
```

C'est ce décalage qui oblige l'application à rapprocher les fichiers par
ressemblance de nom — et c'est ainsi que l'audit de *Malin comme un chimpanzé* a
analysé deux faces de *Light my fire*.

Peut-on renommer les dossiers avec le code complet ?

### 🟠 F2. À quoi correspond le `V5` des noms de fichiers ?

Aucune procédure ne le décrit. Version d'étiquette, révision graphique, millésime ?

Et **21 fichiers sur 276 n'en portent aucun**. Quand un dossier contient une V5 et
une V6, laquelle fait foi ?

### 🟡 F3. Trois séparateurs, et des dossiers qui portent un nom de fichier

Sur 149 dossiers : 112 avec une espace, 30 avec un tiret, 7 avec un tiret bas. Et
quelques cas qui ne suivent aucune règle :

```
BT3542 - POÉSIE EN ROSE            contient  ETTUTO3542…      (BT ≠ TO)
TV1346 JADE DEW                    contient  TV134_… et TV1346_…
TV113_ETVN113V3FF22 Huang Ya Cha   le dossier EST un nom de fichier
TUTJ0706 TUTJ0706 Gyokuro          le code est écrit deux fois
```

### 🟡 F4. Un dossier en double et deux références sans fichier

- `TN5482 - Perles du Laos` et `TN5482_Perles du Laos` : même contenu, deux dossiers.
- `TN2412` (Moon Light Glory) et `TN5472` (Noir du Laos) n'ont **aucun fichier**.
  BAT manquants, ou codes erronés ?
- Cinq produits n'ont que des fichiers Illustrator, aucun PDF : `TH5296`,
  `TU5226`, `TU2092`, `TR2472`, `TB720`.

### 🔴 F5. Deux mentions obligatoires introuvables sur tout le catalogue

**C'est la question la plus lourde de cette liste.** Elle était ouverte sur le
seul TA7372 ; la mesure sur l'ensemble du référentiel montre qu'elle ne lui est
pas propre.

Lecture du texte des **258 BAT** du dossier `RÉFÉRENCES ÉTIQUETTES`, soit
**139 produits** :

| Mention | Exigée par | Retrouvée sur |
|---|---|---|
| **Conditions de conservation** | PRO-QHS-013 §5 | **0 / 139 produits** |
| **Adresse du fabricant** | PRO-QHS-013 §7 | **5 / 139 produits** |

Vérification indépendante à la main sur les **147 contre-étiquettes** : cinq
seulement contiennent « conserv », « abri » ou « Wittisheim ».

Ce n'est pas un défaut de lecture : sur le même corpus, le mot « ingrédients »
sort à 97/139, `FR-BIO-01` à 102/139 et la mention bio à 94/139. Une
contre-étiquette type se lit :

> *…récit produit… 2g / 5-7 min / 95 °C / 50 TASSES · **INGRÉDIENT**
> Honeybush\*. \*Issu de l'agriculture biologique. · ETCHB1702V5 ·
> poids net 100g*

Ni conservation, ni adresse.

**Deux explications, aux conséquences très différentes :**

1. **Le dossier ne contient qu'une partie des faces.** Il manquerait une
   troisième face, ou ces mentions figurent sur le sachet et non sur
   l'étiquette. Dans ce cas nos contrôles 7.2 et 9.1 remonteront une alerte
   perpétuelle sur du conforme, et il faut nous fournir les faces manquantes.
2. **Elles ne sont réellement pas imprimées.** C'est alors une non-conformité à
   l'échelle du catalogue, plus lourde que les dix-sept Eurofeuilles de F6.

**À demander à Marie :** le dossier de référence contient-il *toutes* les faces
d'un produit ? Où figure la mention « À conserver à l'abri de l'humidité, de la
lumière et de la chaleur » ? Et l'adresse de Wittisheim ?

Tant que ce n'est pas tranché, l'application ne peut pas savoir si elle regarde
une étiquette incomplète ou un dossier incomplet.

### 🟠 F8. Trois étiquettes portent l'adresse WFTO sans la mention

Sur les 119 produits dont l'étiquette est lisible : **70 impriment `wfto.com`,
67 impriment « World Fair Trade Organization »**. Aucun ne fait l'inverse.

| Produit | |
|---|---|
| **TB3716** | Griffes de Snowview |
| **TN2156** | Himalayan Secret |
| **TV1346** | Jade Dew |

Les WFTO Label and Mark Guidelines demandent la mention d'appartenance, pas
seulement le lien. Est-ce un choix de mise en page — la place manquait — ou un
oubli à corriger au prochain tirage ?

### 🔴 F6. Dix-sept Eurofeuilles sous le minimum légal

Mesuré au tracé sur **258 BAT** du catalogue — 141 Eurofeuilles reconnues,
aucune erreur sur les 111 contre-étiquettes. Les tailles se rangent en familles
nettes, ce qui désigne un système de gabarits, pas des accidents :

| Champ vert | Étiquettes | |
|---|---|---|
| 13,7 × 9,1 mm | 105 | conforme |
| 16,7 × 11,1 mm | 3 | conforme |
| 9,0 × 6,0 mm | 15 | taille de la dérogation (voir F7) |
| **12,8 × 8,5 mm** | **10** | **sous le minimum**, faces de 74,3 cm² |
| 13,4 × 8,9 mm | 3 | sous le minimum de 0,1 mm |
| 12,7 × 8,5 · 13,2 × 8,7 · 11,8 × 7,8 mm | 4 | sous le minimum |

Le minimum est **13,5 × 9 mm** (manuel Eurofeuille, règlement bio). Dix-sept
étiquettes sont en dessous. TA7372 est à **12,78 × 8,52 mm**, soit 94,7 % du
minimum — un écart de 5 % qu'aucun œil ne rattrape.

Deux gabarits Illustrator suffisent à l'expliquer : l'un calé juste au-dessus du
seuil (13,7), l'autre juste en dessous (12,8).

**À demander :** est-ce connu ? Le gabarit à 12,8 mm est-il une ancienne version
qui traîne ? Corriger le gabarit règle les dix d'un coup.

### 🟠 F7. « Très petit emballage » n'est pas chiffré

Quinze étiquettes portent l'Eurofeuille à **exactement 9,0 × 6,0 mm**, la taille
que le manuel officiel autorise « pour les emballages de très petite taille ».
Leurs faces mesurent 29,6 cm².

Le manuel ne dit nulle part ce qu'est un emballage de très petite taille. Nous
n'avons donc aucun moyen de trancher, et l'application ne le fera pas à la place
de la Qualité : elle nomme la dérogation et demande qu'elle soit assumée.

**À demander :** 29,6 cm², est-ce « très petit » au sens du manuel ? La
dérogation a-t-elle été validée à l'époque, et par qui ? Si oui, écrire le seuil
quelque part une bonne fois.

---

## Karrame — Direction

### 🟡 K1. Qui voit l'écran Archives ?

Un produit supprimé n'est jamais détruit : il rejoint un registre avec son motif,
son auteur et son horodatage. **Aucun retour n'est possible depuis
l'application** — c'est ce qui en fait une trace et non une corbeille.

L'écran est aujourd'hui visible par tous. Faut-il le réserver à la direction ?

*À savoir avant de décider : il affiche **qui** a supprimé quoi, nominativement.*

### 🟡 K2. Qui a le droit de supprimer un produit ?

Aujourd'hui tout le monde, avec motif obligatoire et saisie du code à confirmer.
À restreindre ?

### 🟡 K3. Sauvegardes

L'archivage protège d'une mauvaise manipulation **dans l'application**. Il ne
protège pas d'un accès direct à la base. La réponse à ce risque-là, ce sont les
sauvegardes PostgreSQL — sujet distinct, à cadrer.

---

## Informatique — Jordan Andrade / Denis Muckensturm

*Rédacteur et vérificateur de MOP-PRO-029.*

### 🔴 I1. Export du référentiel matière première depuis PMI

Voir A2. Format libre : CSV, Excel, extraction directe.

### 🟡 I2. Deux générations de GENCODE coexistent

Le format documenté (§3) est `35 + 8281 + famille(2) + article(3) +
conditionnement(1) + clé`. Un second format, plus ancien, porte l'article sur
**quatre chiffres sans conditionnement**.

Mesuré sur 150 EAN : **86 % concordent** avec le code produit. Le second format
est-il officiel, ou en voie d'extinction ?

### 🟠 I4. Le périmètre de la table §2.1.2 (tranches du numéro d'article)

§2.1.2 associe une tranche de numéro à un type de produit (100 = tisane, 700 =
thé noir aromatisé…). Confrontée au catalogue, elle ne tient que pour le préfixe
**TA** :

```
TA 6xx → Thé vert aromatisé / parfumé              ✅ conforme au §2.1.2
TA 7xx → Thé noir aromatisé / parfumé              ✅
TV 1xx, 4xx, 6xx, 7xx → tous « Thé vert d'origine »  ✗ le numéro ne code rien
TN 2xx, 3xx, 4xx, 5xx → tous « Thé noir d'origine »  ✗
```

La table décrit-elle uniquement les **recettes maison** (nature 6 dans PMI), les
thés d'origine achetés-revendus recevant un numéro simplement séquentiel ?

*Nous avons écrit puis retiré le contrôle correspondant : appliqué à tout le
catalogue il produisait 119 avertissements sur 172 fiches. Nous le livrerons dès
que son périmètre sera connu.*

### 🟡 I3. La famille du thé dans le GENCODE

TA7372 porte la famille `04` = « Thé noir parfumé + Aromatisé », alors que la base
le décrit comme « Thé noir aromatisé » — famille `02` selon la table §3. Comment
choisir entre 02 et 04 ?

---

## Points internes SPC — à trancher avec Ouro, pas avec le client

- 🔴 **L'audit BAT n'a jamais été validé** depuis le remplacement de
  `pixtral-large` par `mistral-medium` — le modèle qui avait halluciné un logo AB
  en juin. Le contre-examen ne relit que les verdicts négatifs : un logo
  obligatoire déclaré présent à tort n'est jamais revu.
- 🟠 Le bucket `label-assets` répond aux GET **et aux LIST anonymes**.
- 🟡 `MT265` porte **17 fiches étiquettes** et une recette de **16 lignes pour
  8 ingrédients** — deux imports superposés.
- 🟡 Le chemin de création d'import écrase par `null` tout champ que l'extraction
  ne trouve pas ; la réintégration, elle, préserve.
- 🟡 `code_ean`, `poids_tasse`, `nb_tasses`, `sous_gamme` et les traductions EN ne
  peuvent **jamais** être remplis par un import.
- 🟡 Dette §15 (messages d'erreur IA) et §16 (agents morts).

---

## Ce qu'on peut montrer, en face

Pour équilibrer : ces questions existent parce que l'application les a trouvées.

- **181 événements** tracés depuis le 8 juin, tous nominatifs.
- **604 liens** produit ↔ fichier enregistrés, là où l'association était devinée.
- **Quatre contrôles de cohérence** du code article et du Gencode, adossés à
  MOP-PRO-029, chacun citant son paragraphe. Ils ont trouvé douze
  non-conformités que rien ne vérifiait — dont les deux codes-barres partagés.
- Les documents source d'un import sont désormais **conservés** — un import raté
  reste rejouable.
- Le coût d'un import complet, mesuré : **0,006 $**.
- **Cinq mentions obligatoires** cherchées directement sur le BAT — réglisse,
  les trois mentions d'allégation, WFTO — en plus de la conservation et de
  l'adresse. C'est ce qui a produit M9, M10 et F8, sans consommer un jeton.
