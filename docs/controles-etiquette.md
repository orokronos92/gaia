# Les contrôles faits sur une étiquette

**Source** : registre `src/lib/audit/control-checklist.ts` — ce document en est
**généré**, il ne le paraphrase pas. Toute divergence est un bug du document.
**Dernière génération** : 8 septembre 2026.

L'audit transpose **PRO-QHS-013** (procédure JDG de vérification d'étiquetage,
v.1 du 30/03/2023), complété par **MOP-PRO-029** pour le code article et le
Gencode. **39 points de contrôle**, tous exécutés à chaque lancement — un
contrôle absent est un oubli, un contrôle muet est un mensonge par omission.

---

## 1. Qui répond à quoi

Chaque point porte une **voie**, et la voie décide de l'exécutant. C'est un
contrat dur : un point déterministe n'est **jamais** soumis à un modèle.

| Voie | 39 points | Qui tranche | Coût |
|---|---|---|---|
| **Code · fiche** | 16 | Du code pur, sur les données de la fiche : calcul, seuil, comparaison de chaînes | 0 jeton |
| **Code · BAT** | 10 | Du code pur, sur le PDF du BAT : mesure de tracés, de corps de police, de positions | 0 jeton |
| **Modèle** | 9 | Mistral, pour l'interprétation d'une règle rédigée — jamais pour un calcul | facturé |
| **Œil** | 4 | Marie, sur le BAT : ce que ni le code ni le modèle ne savent encore lire | 0 jeton |

**Le contrôle est gratuit.** Le bouton « Contrôler » exécute les
26 points de code sans consommer un jeton. Le bouton
« Analyse IA » n'ajoute que les 9 points où un modèle fait mieux —
reconnaître un dessin, juger une équivalence de sens.

## 2. Ce que dit un résultat

Chaque point rend un **statut** — ce que la mesure a trouvé — et une **action** —
ce qu'il reste à faire. Ce sont deux questions différentes, et c'est l'action que
la Qualité lit en tête d'écran.

| Action | Sens |
|---|---|
| 🔴 **À corriger** | Non-conformité prouvée. Elle se ferme par une correction, ou par une **dérogation motivée** que la Qualité assume |
| 🔵 **À compléter** | La fiche est muette. Il n'y a rien à regarder sur le BAT tant qu'elle ne porte pas la donnée |
| 🟠 **À vérifier** | Le constat est posé, la décision revient à Marie |
| 🟢 **Vérifié** | Rien à faire |

Une décision de la Qualité est attachée au **constat qu'elle répondait** : si le
contrôle ne dit plus la même chose après un nouveau BAT, la ligne se rouvre en le
disant.

## 3. Les colonnes du tableau

- **BAT** — `zone` : le contrôle sait **où** il a mesuré et le montre sur
  l'étiquette ; `propose` : il a lu sur le BAT une valeur que la fiche n'a pas et
  l'offre en un clic. Il ne l'écrit jamais lui-même — la fiche reste la
  référence, sinon le contrôle validerait sa propre invention.
  Cette colonne est **relevée sur les fiches de référence TA737 et TA7372**, pas
  déclarée : un tiret dit « rien montré sur ces deux étiquettes-là », pas « ne
  montre jamais rien ». Un point ne peut désigner que ce qu'il a trouvé.
- Un point de voie **Modèle** peut porter une zone : les preuves lues par le code
  sur le BAT viennent remplir la même ligne. Une non-conformité est une
  non-conformité quelle que soit son origine.
- **†** — point **conditionnel** : sans objet si le produit ne s'y prête pas
  (pas de thé, pas d'arôme, pas d'allergène…). 7 points le sont :
  1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 8.3.

---

## 4. Les 39 points

### Dénomination de la denrée

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **1.0** | La dénomination légale décrit-elle objectivement le produit (état physique / traitement subi) ? | Modèle | — | PRO-QHS-013 §1 ; INCO art. 9 et 13 |
| **1.1** † | Si dénomination « thé » : le produit contient-il ≥ 51 % de Camellia sinensis ? | Code · fiche | — | PRO-QHS-013 §1.1 |
| **1.2** † | Arôme présent : la mention « aromatisé / goût / saveur » figure-t-elle en dénomination, conforme au tableau §1.2 ? | Modèle | — | PRO-QHS-013 §1.2 ; STEPI ; règl. 1334/2008 |
| **1.3** † | La mention « parfumé » est-elle utilisée UNIQUEMENT pour une aromatisation par enfleurage ? | Modèle | — | PRO-QHS-013 §1.2 |
| **1.4** | La dénomination figure-t-elle dans le même champ visuel que le poids net, en caractères droits et lisibles ? | Code · BAT | zone | PRO-QHS-013 §1 ; INCO art. 9/13 |

### Liste des ingrédients

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **2.1** | Le mot « ingrédients » précède-t-il la liste ? | Code · BAT | zone | PRO-QHS-013 §2.1 |
| **2.2** | Les ingrédients sont-ils listés par ordre d'importance pondérale décroissante ? | Code · fiche | — | PRO-QHS-013 §2.1 |
| **2.3** | Mono-ingrédient : la liste est-elle correctement omise (dénomination = nom de l'ingrédient) ? | Code · fiche | — | PRO-QHS-013 §2.1 |
| **2.4** | Étoiles présentes (* bio / ** demeter) avec la mention de certification associée, demeter en gras italique ? | Code · BAT | — | PRO-QHS-013 §11.1 |

### QUID (pourcentages)

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **3.1** | Un % est-il déclaré pour chaque ingrédient figurant en dénomination, mis en avant graphiquement, ou source de confusion ? | Code · fiche | — | PRO-QHS-013 §2.2 |
| **3.2** | Règle d'arrondi respectée : un chiffre après la virgule (2e décimale 0-4 → inférieur, 5-9 → supérieur) ? | Code · fiche | — | PRO-QHS-013 §2.2 |
| **3.3** | Si total > 100 % du fait des arrondis, l'ajustement porte-t-il sur l'ingrédient le plus important ? | Code · fiche | — | PRO-QHS-013 §2.2 |

### Déclaration nutritionnelle

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **4.1** | Le produit relève-t-il d'une catégorie exemptée (infusions, thés, mélanges sans modification de la valeur nutritionnelle) ? | Modèle | — | PRO-QHS-013 §2.3 ; annexe 1 |
| **4.2** | Si l'aromatisation modifie la valeur nutritionnelle (ex. caramel) : la mention « Informations nutritionnelles moyennes pour 100 ml… » figure-t-elle ? | Modèle | — | PRO-QHS-013 §2.3 |

### Particularités

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **5.1** † | Allergènes présents : mis en évidence (gras / souligné) et conformes à LIS-QHS-008 ? | Code · fiche | — | PRO-QHS-013 §3.1 ; annexe 2 |
| **5.2** † | Allégation présente : valeurs nutritionnelles + mention « mode de vie sain… » + « consommation journalière conseillée : x tasses de 25 cl » (+ grammage sur logo tasse si ≠ 2 g) ? | Modèle | — | PRO-QHS-013 §3.2 |
| **5.3** † | Réglisse présente : mention JDG « Contient de la réglisse – Les personnes souffrant d'hypertension doivent éviter toute consommation excessive » ? | Code · fiche | — | PRO-QHS-013 §3.3 ; annexe 3 |

### Quantité nette

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **6.1** | Quantité nette exprimée en unité de masse (g ou kg) ? | Code · fiche | zone + **propose** | PRO-QHS-013 §4 |
| **6.2** | Hauteur des chiffres conforme (2 mm si ≤ 50 g ; 3 mm si 50-200 g ; 4 mm si 200-1000 g ; 6 mm si > 1000 g), dans le même champ visuel que la dénomination ? | Code · BAT | zone | PRO-QHS-013 §4 |

### Conservation et mode d'emploi

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **7.1** | Mode d'emploi présent si nécessaire (nb sachets/cuillères, température, durée), sans recours exclusif à des symboles ? | Code · BAT | zone | PRO-QHS-013 §5 |
| **7.2** | Mention JDG « À conserver à l'abri de l'humidité, de la lumière et de la chaleur » présente ? | Code · fiche | — | PRO-QHS-013 §5 |

### Origine géographique

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **8.1** | Indication de l'origine des matières premières placée sous le code de l'organisme de contrôle, sous l'Eurofeuille ? | Code · BAT | zone | PRO-QHS-013 §6 et §11.1 |
| **8.2** | Mention « Agriculture UE / non UE / pays » cohérente avec ≥ 98 % des matières premières de cette origine ? | Modèle | zone | PRO-QHS-013 §6 et §11.1 |
| **8.3** † | Mention volontaire d'origine réservée à un produit contenant > 50 % de cette origine ? | Modèle | — | PRO-QHS-013 §6 |

### Fabricant

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **9.1** | Adresse JDG complète présente (LES JARDINS DE GAÏA – Z.A. – 6 rue de l'Écluse – FR-67820 Wittisheim + site web), sans code emballeur ? | Code · fiche | — | PRO-QHS-013 §7 |

### Gencode

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **10.1** | Code-barres IMPRIMÉ sur le BAT identique au Gencode déclaré en fiche ? | Œil | — | PRO-QHS-013 §8 ; annexe 4 ; MOP-PRO-029 §3 |

### Métrologie

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **11.1** | Le « e » métrologique est-il bien ABSENT (politique JDG) ? | Code · BAT | — | PRO-QHS-013 §9 |

### Pictogrammes

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **12.1** | Triman présent, ≥ 1×1 cm (ou ≥ 0,6×0,6 cm si contrainte technique) ? | Œil | — | PRO-QHS-013 §10.1 ; décret 2022-975 |
| **12.2** | Cartouche Info-Tri complet (Triman + « le tri + facile » + éléments séparés par + + destination), règles de dématérialisation selon surface respectées ? | Œil | — | PRO-QHS-013 §10.2 ; annexe 5 ; loi AGEC art. 17 |

### Labels

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **13.1** | Eurofeuille présente, dimensions ≥ L 13,5 × H 9 mm (proportions 1/1,15), dans le même champ visuel que le code OC et l'origine ? | Code · BAT | zone | PRO-QHS-013 §11.1 ; annexe 6 |
| **13.2** | Code de l'organisme de contrôle du dernier opérateur présent (FR-BIO-01) ? | Code · BAT | zone | PRO-QHS-013 §11.1 |
| **13.3** | Labels non officiels (WFTO, Fairtrade, Elephant Friendly, FFL, Demeter…) justifiés par la matière première et correctement apposés ? | Modèle | — | PRO-QHS-013 §11.2 ; annexe 7 |
| **13.4** | Logo Point Vert bien ABSENT (interdit depuis le 01/01/2021, loi AGEC) ? | Œil | — | PRO-QHS-013 §11.2 ; loi 2020-105 |

### Typographie

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **14.1** | Hauteur de x des mentions obligatoires conforme à la face la plus grande (0,9 mm si < 80 cm² ; ≥ 1,2 mm si > 80 cm²) ? | Code · BAT | zone | PRO-QHS-013 §12 ; INCO art. 13.2/13.3/16.2 |

### Code étiquette

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **15.1** | Code étiquette présent sur la contre-étiquette ? | Code · fiche | zone + **propose** | PRO-QHS-013 §13 |

### Code article et Gencode

| Point | Ce qui est vérifié | Voie | BAT | Référence |
|---|---|---|---|---|
| **16.1** | Le code produit porte-t-il un chiffre de conditionnement (1 à 7) ? | Code · fiche | — | MOP-PRO-029 §2.1.3 |
| **16.2** | Le chiffre de conditionnement correspond-il au poids net déclaré ? | Code · fiche | — | MOP-PRO-029 §2.1.3 |
| **16.3** | Le Gencode déclaré décode-t-il le même article et le même conditionnement, avec une clé valide ? | Code · fiche | — | MOP-PRO-029 §3 |
| **16.4** | Le Gencode est-il porté par ce seul produit ? | Code · fiche | — | MOP-PRO-029 §3 ; GS1 |

---

## 5. Ce qui n'est pas encore automatisé

Quatre points restent à l'œil, faute de savoir les lire :

| Point | Pourquoi |
|---|---|
| **10.1** Gencode imprimé | Le code-barres est **dessiné**, ses chiffres vectorisés : 0 des 139 produits mesurés en donne un chiffre lisible en texte |
| **12.1** Triman | Reconnaissance d'un pictogramme à son tracé — non écrite |
| **12.2** Cartouche Info-Tri | Absent de 139/139 BAT mesurés : rien à reconnaître pour l'instant |
| **13.4** Point Vert absent | Prouver l'absence d'un logo demande de savoir le reconnaître |

Et trois points reposent sur une donnée qui n'existe pas encore en base :
Camellia sinensis (1.1), présence de réglisse (5.3), pourcentage par origine
(8.2 / 8.3).

---

## 6. Pour aller plus loin

- Ce que la lecture des BAT a mesuré sur tout le catalogue :
  `docs/decisions/2026-09-08-controle-bat-par-le-pdf.md`
- L'écran de contrôle et les décisions de la Qualité :
  `docs/decisions/2026-09-08-ecran-controle-et-mesures-bat.md`
- Les procédures JDG elles-mêmes : `docs/referentiels/`
