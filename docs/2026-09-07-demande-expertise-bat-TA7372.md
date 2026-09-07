# Demande d'expertise — audit d'étiquette TA7372 « Malin comme un chimpanzé »

**Date** : 7 septembre 2026
**Demandeur** : SPC, pour Les Jardins de Gaïa
**Objet** : obtenir un avis indépendant sur deux BAT, afin de valider (ou non) la
fiabilité du modèle de vision utilisé par l'application GaïaLabel.

---

## 1. Pourquoi cette demande

GaïaLabel est une application de gestion des étiquettes alimentaires pour Les
Jardins de Gaïa (thés et infusions bio, Alsace). Elle contient un audit
d'étiquetage qui compare le BAT (Bon À Tirer) aux données de la fiche produit et
vérifie la présence des logos réglementaires.

Ce contrôle des logos s'appuie sur un modèle de vision. **Le modèle a changé
récemment et nous ne pouvons pas valider son résultat avec lui-même** — ce serait
circulaire. Il nous faut un avis extérieur, rendu en regardant les fichiers.

Contexte du changement, pour comprendre l'enjeu :

- Jusqu'en juin 2026, le modèle utilisé était **`pixtral-large`**. Il avait été
  retenu après comparaison, parce qu'un autre modèle testé (`mistral-medium`)
  **avait halluciné un logo AB qui ne figurait pas sur l'étiquette**.
- `pixtral-large` a depuis été **retiré du catalogue Mistral**.
- Le robot tourne donc aujourd'hui sur `mistral-medium` — précisément le modèle
  qui avait échoué à ce test. Ce n'était pas un choix : aucune autre option
  multimodale du compte n'accepte l'envoi direct d'un PDF.

Le garde-fou en place (une seconde lecture contradictoire) ne se déclenche que
sur les contrôles négatifs. **Un logo déclaré présent à tort n'est jamais
revérifié** — or c'est exactement le mode d'échec observé en juin.

---

## 2. Les fichiers

Deux faces, exportées depuis le stockage de l'application :

```
/docker/gaialabel/exports/TA7372/
├── ETCNA7372V5 - MALIN COMME UN CHIMPANZÉ.pdf   (686 Ko)
└── ETNA737V5 - Malin comme un chimpanzé.pdf     (1,4 Mo)
```

Produit : **TA7372 — Malin comme un chimpanzé**, thé noir aromatisé figue / miel
/ thym, gamme « Les Militants ».

---

## 3. Ce que l'application a vérifié, et ce qu'elle a trouvé

### 3.1 Les cinq logos (contrôle par le modèle de vision)

Le modèle répond uniquement **PRÉSENT / ABSENT / INCERTAIN** pour chaque logo. Le
verdict de conformité est ensuite décidé par du code, selon l'attente
réglementaire :

| Logo | Description donnée au modèle | Attendu |
|---|---|---|
| **Eurofeuille** | feuille verte composée d'étoiles, logo bio UE | **REQUIS** |
| **Triman** | silhouette stylisée avec trois flèches, logo de tri | **REQUIS** |
| **Info-Tri** | cartouche Info-Tri, consignes de tri en bloc | Optionnel |
| **Point Vert** | deux flèches vertes enlacées formant un cercle | **INTERDIT** |
| **WFTO** | logo World Fair Trade Organization | Optionnel |

Le Point Vert est le seul dont la **présence** constitue la faute : il n'a plus
cours en France.

Règle d'agrégation entre les deux faces : un seul PRÉSENT suffit à considérer le
logo présent pour le produit.

**Nous ne savons pas ce que le modèle a répondu** — les verdicts ne sont pas
enregistrés en base, seule la consommation de jetons l'est. Nous savons seulement
que la seconde lecture contradictoire s'est déclenchée, donc qu'**au moins un
logo est ressorti négatif ou incertain** au premier passage.

### 3.2 Les contrôles de texte (code déterministe, sans IA)

Résultats obtenus sur les deux faces :

```
[FAIL]    Ingrédients — non retrouvés à l'identique :
          SORWATHE OP1° 38.5 % ; HONEYBUSH 32 % ; MORCEAUX DE FIGUE 19.5 % ;
          AROME BIO 2022 figue 4.5 % ; AROME BIO 2022 miel 4 % ; THYM 1 % ;
          pétales de souci 0.5 %
[WARNING] Dénomination — non retrouvée sur les faces analysées
[WARNING] Poids net — donnée absente de la fiche, non vérifiable
[WARNING] Code étiquette — donnée absente de la fiche, non vérifiable
[WARNING] Mention de conservation — non retrouvée sur les faces analysées
[WARNING] Adresse fabricant — non retrouvée sur les faces analysées
```

### 3.3 Le texte que notre extracteur a réussi à lire

1 531 caractères au total pour les deux faces. Reproduit intégralement ci-dessous,
parce qu'un écart entre ce texte et ce qui est réellement imprimé fait partie des
questions posées.

```
ETCNA7372V5
poids net
100g
50
TASSES
2g /
TASSE
3min
90°C
                       alin comme un chimpanzé
L'association Projet pour la Conservation des Grands Singes
(PCGS) œuvre à la protection des chimpanzés sauvages et de
leurs habitats, les forêts tropicales.
helloasso.com/associations/projet-pour-la-conservation-des-grands-singes
INGRÉDIENTS
Thé noir*, honeybush*, morceaux de figue* 19%,
arôme naturel de (figue 5%, miel* 4%), thym* 1%,
pétales de souci*. *Issu de l'agriculture biologique.
          AGIR POUR LA NATURE
0,50 € REVERSÉS À PROJET POUR LA CONSERVATION DES GRANDS SINGES
Sur la base d'un excellent thé noir ougandais, cette
recette de thé noir tout en douceur est dédiée à nos
"cousins" aussi malins qu'attachants. Ses saveurs de
thym et de miel viennent agréablement surprendre
le palais avant de laisser place à de délicieuses
notes de figue dont raffolent les chimpanzés...
--------- saut de page ---------

SAVEUR MIEL
FIGUE ET THYM
MALIN COMME UN
0,50
REVERSÉS À
€
THÉ NOIR
Chimpanzé
AGIR
POUR LA NATURE
CERTIFIÉ PAR FR-BIO-01
AGRICULTURE UE/non UE
```

Deux observations qui orientent les questions :

- Le mot « **M**alin » ressort amputé de son M — probablement une lettre
  vectorisée, donc invisible à l'extraction de texte.
- Les mentions `CERTIFIÉ PAR FR-BIO-01` et `AGRICULTURE UE/non UE` sont celles
  qui **accompagnent obligatoirement l'Eurofeuille**. Leur présence rend probable
  celle du logo, sans la prouver.

### 3.4 Les données de la fiche produit, pour comparaison

```
Dénomination     : Malin comme un chimpanzé
Gamme            : Les Militants
Ingrédients      : SORWATHE OP1° 38.5 %, HONEYBUSH 32 %, MORCEAUX DE FIGUE 19.5 %,
                   AROME BIO 2022 figue 4.5 %, AROME BIO 2022 miel 4 %,
                   THYM 1 %, pétales de souci 0.5 %.
Allergènes       : Aucun
Allégation       : (vide)
Poids net        : (vide)
Code étiquette   : (vide)
Temps infusion   : 3 mn
Temp. infusion   : 95°C
Conservation     : À conserver à l'abri de l'humidité de la lumière et de la chaleur
Fabricant        : LES JARDINS DE GAÏA – Z.A. – 6, RUE DE L'ÉCLUSE – FR-67820 WITTISHEIM
```

---

## 4. Questions posées

### A — Les logos (question principale)

Pour **chacun des cinq logos**, en regardant les deux PDF :

1. Est-il **présent** ? Sur quelle face, et à quel emplacement ?
2. S'il est absent, y a-t-il un logo **visuellement proche** susceptible d'être
   confondu avec lui ? (Le risque évalué ici est celui d'un logo *inventé* par le
   modèle, pas seulement d'un logo manqué.)

Le Point Vert mérite une attention particulière : sa présence serait une
non-conformité réelle à signaler.

### B — Les mentions non retrouvées

3. La **mention de conservation** (« À conserver à l'abri de l'humidité, de la
   lumière et de la chaleur ») figure-t-elle sur l'une des deux faces ?
4. L'**adresse du fabricant** (Les Jardins de Gaïa, Wittisheim) y figure-t-elle ?

Ces deux mentions sont absentes du texte extrait. Deux explications possibles, et
elles n'ont pas les mêmes conséquences :

- soit elles **sont** sur l'étiquette et notre extraction les a manquées — défaut
  technique de notre côté ;
- soit elles **n'y sont pas** — non-conformité réglementaire réelle ;
- soit elles figurent sur une **troisième face** que nous n'avons pas — il
  manquerait alors un fichier dans le dossier.

Merci de préciser laquelle.

### C — La liste d'ingrédients

Notre contrôle compare la liste de la **recette** au texte de l'**étiquette**, et
échoue :

| Recette (fiche) | Étiquette (BAT) |
|---|---|
| `SORWATHE OP1° 38.5 %` | `Thé noir*` |
| `HONEYBUSH 32 %` | `honeybush*` (sans %) |
| `MORCEAUX DE FIGUE 19.5 %` | `morceaux de figue* 19%` |
| `AROME BIO 2022 figue 4.5 %` | `arôme naturel de (figue 5%…` |
| `AROME BIO 2022 miel 4 %` | `…miel* 4%)` |
| `THYM 1 %` | `thym* 1%` |
| `pétales de souci 0.5 %` | `pétales de souci*` (sans %) |

5. Cette liste d'étiquette est-elle **conforme au règlement INCO** (UE 1169/2011)
   telle qu'imprimée ? En particulier : les arrondis (19,5 → 19 % ; 4,5 → 5 %),
   le regroupement des arômes entre parenthèses, l'absence de pourcentage sur le
   honeybush et les pétales de souci.
6. Comment devrait-on comparer une recette et une liste d'ingrédients d'étiquette,
   sachant que la réglementation impose qu'elles diffèrent (dénomination légale
   contre référence matière première, arrondis QUID, regroupements) ?

### D — Une contradiction relevée

L'étiquette indique **3 min à 90 °C**. La fiche produit porte **3 mn à 95 °C** —
valeur qui provient en réalité du protocole de dégustation interne (95 °C, 4 mn),
recopiée à tort dans les paramètres d'infusion destinés à l'étiquette.

7. Confirmez-vous que le BAT indique bien **90 °C** ?

### E — Ouverture

8. En regardant ces deux BAT, voyez-vous une **non-conformité que nos contrôles
   ne cherchent pas** ? La liste actuelle porte sur : ingrédients, dénomination,
   poids net, code étiquette, conservation, fabricant, allergènes, et les cinq
   logos ci-dessus.

---

## 5. Format de réponse souhaité

Pour la partie A, un tableau simple suffit :

| Logo | Présent ? | Face | Emplacement | Remarque |
|---|---|---|---|---|

Pour le reste, une réponse numérotée reprenant les questions 3 à 8.

**Précision importante** : la question posée n'est pas « que dirait un modèle ? »
mais « qu'y a-t-il réellement sur ces étiquettes ? ». La réponse servira de
référence pour juger notre propre chaîne d'analyse.

---

## 6. Ce qui sera fait de la réponse

- Si le modèle de vision de GaïaLabel s'avère fiable sur ces cinq logos, la
  chaîne est conservée en l'état pour la démonstration client du
  **vendredi 11 septembre 2026**.
- S'il ne l'est pas, bascule vers `ministral-14b` ou vers une lecture OCR jugée
  par du code, avant la démonstration.
- Les réponses B, C et E alimenteront la révision des contrôles déterministes,
  dont plusieurs produisent aujourd'hui des alertes non pertinentes.
