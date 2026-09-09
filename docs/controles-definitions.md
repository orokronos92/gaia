# Les contrôles d'étiquette — définitions

**Objet** : liste exhaustive des contrôles exécutés par GaïaLabel, avec pour
chacun sa référence réglementaire et la définition de ce qu'il fait réellement.
Document destiné à être mis en regard de **PRO-QHS-013** et **MOP-PRO-029**,
paragraphe par paragraphe.

**Source** : registre `src/lib/audit/control-checklist.ts`. Les identifiants,
libellés, voies et références sont **extraits du code**, pas recopiés.
**Généré le 9 septembre 2026** — 42 points.

---

## Comment lire ce document

Chaque contrôle porte une **voie**, qui dit qui y répond. C'est un contrat dur :
un contrôle de voie « code » n'est jamais soumis à un modèle de langage.

| Voie | Points | Qui répond | IA |
|---|---|---|---|
| 🟩 **Code · fiche** | 20 | Du code, sur les données de la fiche et de la recette : calcul, seuil, comparaison de chaînes | non |
| 🟦 **Code · BAT** | 11 | Du code, sur le PDF du bon à tirer : mesure de tracés, de corps de police, de positions | non |
| 🟨 **Modèle** | 7 | Un modèle de langage ou de vision, pour l'interprétation d'une règle rédigée ou la reconnaissance d'un dessin | oui |
| ⬜ **Œil** | 4 | La Qualité, sur le bon à tirer : ce que ni le code ni le modèle ne savent lire aujourd'hui | — |

**31 des 42 contrôles s'exécutent sans aucune IA**, à chaque
lancement, sans consommer de jeton. Les 7 contrôles de voie « modèle »
ne s'exécutent que sur demande explicite.

Un point **conditionnel** ne s'applique qu'à certains produits : pas de thé, pas
d'arôme, pas d'allergène déclaré — il est alors classé « sans objet » et sort de
la liste de travail sans disparaître du registre.

**Une précision importante pour la mise en regard** : un contrôle de voie
« modèle » peut recevoir en plus une preuve mesurée par le code sur le bon à
tirer. Les deux se cumulent sur la même ligne. Réciproquement, un contrôle de
voie « code · fiche » est presque toujours doublé d'une lecture du bon à tirer :
la fiche dit ce qui devrait être imprimé, le BAT dit ce qui l'est.

---

## 1. Dénomination de la denrée

### 🟨 1.0 — La dénomination légale décrit-elle objectivement le produit (état physique / traitement subi) ?

**Voie** : Modèle · **Sans IA** : non  
**Référence** : PRO-QHS-013 §1 ; INCO art. 9 et 13

Un modèle lit la dénomination portée par la fiche et juge si elle décrit le produit de façon objective — état physique, traitement subi — plutôt que par une formule commerciale. Aucune mesure ne remplace ce jugement de rédaction.

*Données lues* : Dénomination de la fiche.

### 🟩 1.1 — Si dénomination « thé » : le produit contient-il ≥ 51 % de Camellia sinensis ?

**Voie** : Code · fiche · *conditionnel* · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §1.1

Somme les kilos des ingrédients marqués « Camellia sinensis » dans la recette, divise par la masse totale, et compare à 51 %. En dessous, la dénomination « thé » n'est pas due. **Aujourd'hui muet** : le marqueur Camellia n'est renseigné sur aucune ligne de recette du catalogue.

*Données lues* : Recette : quantités en kg + marqueur Camellia par ingrédient.

### 🟨 1.2 — Arôme présent : la mention « aromatisé / goût / saveur » figure-t-elle en dénomination, conforme au tableau §1.2 ?

**Voie** : Modèle · *conditionnel* · **Sans IA** : non  
**Référence** : PRO-QHS-013 §1.2 ; STEPI ; règl. 1334/2008

Un modèle confronte la dénomination au tableau §1.2, qui associe chaque nature d'aromatisation à une écriture imposée : « thé à la menthe » pour un aromate seul, « thé aromatisé menthe » dès qu'un arôme entre, etc.

*Données lues* : Dénomination + liste d'ingrédients de la fiche.

### 🟨 1.3 — La mention « parfumé » est-elle utilisée UNIQUEMENT pour une aromatisation par enfleurage ?

**Voie** : Modèle · *conditionnel* · **Sans IA** : non  
**Référence** : PRO-QHS-013 §1.2

Un modèle vérifie que le mot « parfumé » n'est employé que pour un thé parfumé par enfleurage — fleurs posées sur les feuilles. **Toujours sans objet** : l'application n'a pas de champ déclarant l'enfleurage.

*Données lues* : Dénomination + drapeau enfleurage (absent).

### 🟦 1.4 — La dénomination figure-t-elle dans le même champ visuel que le poids net, en caractères droits et lisibles ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §1 ; INCO art. 9/13

Deux mesures sur le PDF du BAT. D'abord la position : les mots de la dénomination et ceux du poids net sont-ils sur la même face, et à quelle distance en millimètres. Ensuite le style : la police de chaque mot de la dénomination est interrogée sur son angle d'italique — le §1 exige des caractères droits.

*Données lues* : BAT : coordonnées des mots + métriques de police.

### 🟦 1.5 — La dénomination portée par la fiche figure-t-elle à l'identique sur le BAT ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §1 ; INCO art. 9 et 13

Cherche la dénomination de la fiche, mot pour mot, dans le texte du BAT. Le §1 interdit qu'un nom commercial tienne lieu de dénomination de la denrée : si la fiche dit « Thé noir aromatisé » et que l'étiquette imprime « THÉ NOIR », l'écart est signalé.

*Données lues* : Dénomination de la fiche + texte du BAT.

### 🟩 1.6 — Infusion : la dénomination légale est-elle l'un des noms usuels autorisés (tisane, infusion, mélange de plantes à infusion…) ?

**Voie** : Code · fiche · *conditionnel* · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §1.3 ; STEPI

La réglementation ne définit aucune dénomination légale pour les plantes à infusion : la procédure ferme elle-même la liste des noms usuels (tisane, infusion, préparation ou mélange de plantes). Le contrôle vérifie que la dénomination légale de la fiche en contient un.

*Données lues* : Dénomination légale de la fiche.

## 2. Liste des ingrédients

### 🟦 2.1 — Le mot « ingrédients » précède-t-il la liste ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §2.1

Localise le mot « INGRÉDIENTS » sur le BAT et vérifie qu'il précède bien la liste, dans l'ordre de lecture de la face.

*Données lues* : BAT : mots et leur ordre de lecture.

### 🟩 2.2 — Les ingrédients sont-ils listés par ordre d'importance pondérale décroissante ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §2.1

Vérifie que les ingrédients de la recette sont classés par masse décroissante, en comparant l'ordre d'affichage aux quantités en kilos.

*Données lues* : Recette : quantités en kg + ordre de tri.

### 🟩 2.3 — Mono-ingrédient : la liste est-elle correctement omise (dénomination = nom de l'ingrédient) ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §2.1

Un produit à un seul ingrédient peut légitimement omettre sa liste, à condition que la dénomination soit le nom de l'ingrédient. Le contrôle vérifie cette équivalence.

*Données lues* : Recette + dénomination de la fiche.

### 🟦 2.4 — Étoiles présentes (* bio / ** demeter) avec la mention de certification associée, demeter en gras italique ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §11.1

Deux lectures du BAT. Les marqueurs d'abord : une étoile pour un ingrédient bio, deux pour un ingrédient Demeter, avec la mention de certification correspondante. Le style ensuite : le mot « demeter » doit être en gras italique — vérifié sur la police du PDF, pas à l'œil.

*Données lues* : BAT : mots, marqueurs et métriques de police.

## 3. Déclaration quantitative (QUID)

### 🟩 3.1 — Un % est-il déclaré pour chaque ingrédient figurant en dénomination, mis en avant graphiquement, ou source de confusion ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §2.2

Vérifie qu'un pourcentage est déclaré pour chaque ingrédient qui figure en dénomination, qui est mis en avant graphiquement, ou qui peut prêter à confusion. Un ingrédient dont le % est volontairement masqué sur l'étiquette (secret industriel) est signalé en alerte explicite, jamais en non-conformité.

*Données lues* : Recette calculée : pourcentages + drapeau de masquage.

### 🟩 3.2 — Règle d'arrondi respectée : un chiffre après la virgule (2e décimale 0-4 → inférieur, 5-9 → supérieur) ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §2.2

Applique la règle d'arrondi du §2.2 : un chiffre après la virgule, deuxième décimale de 0 à 4 vers le bas, de 5 à 9 vers le haut. Le calcul est fait par le moteur de recette et comparé à ce que porte la fiche.

*Données lues* : Recette : quantités en kg.

### 🟩 3.3 — Si total > 100 % du fait des arrondis, l'ajustement porte-t-il sur l'ingrédient le plus important ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §2.2

Quand la somme des pourcentages arrondis dépasse 100 %, la procédure impose de reporter l'écart sur l'ingrédient le plus important en masse. Le contrôle vérifie que c'est bien celui-là qui a été ajusté.

*Données lues* : Recette calculée : pourcentages bruts et étiquette.

## 4. Déclaration nutritionnelle

### 🟩 4.1 — Le produit relève-t-il d'une catégorie exemptée (infusions, thés, mélanges sans modification de la valeur nutritionnelle) ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §2.3 ; annexe 1

Compare la catégorie du produit à la liste fermée des catégories que la procédure déclare exemptées de déclaration nutritionnelle — thés, infusions, mélanges, rooibos, maté, matcha. L'exception prime : dès qu'une allégation de santé est déclarée, l'exemption tombe. Le contrôle vérifie aussi, sur le BAT, si la face la plus grande passe sous 25 cm², seuil d'exemption de l'INCO.

*Données lues* : Catégorie et allégation de la fiche + surface mesurée sur le BAT.

### 🟩 4.2 — Si l'aromatisation modifie la valeur nutritionnelle (ex. caramel) : la mention « Informations nutritionnelles moyennes pour 100 ml… » figure-t-elle ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §2.3

Cherche dans la composition les ingrédients de nature à modifier la valeur nutritionnelle — caramel, sucre, chocolat, cacao, fruits confits, sirop. S'il en trouve, la mention « Informations nutritionnelles moyennes pour 100 ml… » devient obligatoire et le point demande à être regardé.

*Données lues* : Liste d'ingrédients de la fiche + désignations de la recette.

## 5. Particularités

### 🟩 5.1 — Allergènes présents : mis en évidence (gras / souligné) et conformes à LIS-QHS-008 ?

**Voie** : Code · fiche · *conditionnel* · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §3.1 ; annexe 2

Trois lectures. Le contrôle vérifie que l'allergène déclaré sur la fiche figure sur le BAT ; que sa police le distingue du reste de la liste (le gras se lit dans le fichier, le soulignement non) ; et, quand l'étiquette ne porte pas de liste d'ingrédients — cas légitime d'un mono-ingrédient —, que l'allergène est annoncé par « contient … ».

*Données lues* : Allergènes de la fiche + texte et polices du BAT.

### 🟨 5.2 — Allégation présente : valeurs nutritionnelles + mention « mode de vie sain… » + « consommation journalière conseillée : x tasses de 25 cl » (+ grammage sur logo tasse si ≠ 2 g) ?

**Voie** : Modèle · *conditionnel* · **Sans IA** : non  
**Référence** : PRO-QHS-013 §3.2

Un modèle juge si le texte commercial constitue une allégation. Le code, lui, cherche sur le BAT les trois mentions que le §3.2 rend alors obligatoires : « …dans le cadre d'un mode de vie sain », « consommation journalière conseillée : x tasses de 25 cl », et les valeurs nutritionnelles moyennes.

*Données lues* : Allégation de la fiche + texte du BAT.

### 🟩 5.3 — Réglisse présente : mention JDG « Contient de la réglisse – Les personnes souffrant d'hypertension doivent éviter toute consommation excessive » ?

**Voie** : Code · fiche · *conditionnel* · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §3.3 ; annexe 3

Détecte la réglisse dans la composition, puis cherche sur le BAT l'avertissement « Contient de la réglisse — les personnes souffrant d'hypertension doivent éviter toute consommation excessive ». Les Jardins de Gaïa appliquent cette mention à tous leurs produits contenant de la réglisse, sans distinguer les deux seuils du §3.3.

*Données lues* : Composition + texte du BAT.

## 6. Quantité nette

### 🟩 6.1 — Quantité nette exprimée en unité de masse (g ou kg) ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §4

Vérifie que la quantité nette est exprimée en unité de masse. Le catalogue stocke le plus souvent un nombre nu : la convention connue s'applique — au-delà de 10, des grammes ; en deçà, des kilos. Une quantité exprimée en volume est une non-conformité. Le BAT est lu en parallèle, et propose sa valeur en un clic quand la fiche est muette.

*Données lues* : Poids net de la fiche + texte du BAT.

### 🟦 6.2 — Hauteur des chiffres conforme (2 mm si ≤ 50 g ; 3 mm si 50-200 g ; 4 mm si 200-1000 g ; 6 mm si > 1000 g), dans le même champ visuel que la dénomination ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §4

Mesure la hauteur réelle des chiffres du poids net sur le BAT, en millimètres, à partir du corps de la police, et la compare au seuil de la tranche : 2 mm jusqu'à 50 g, 3 mm jusqu'à 200 g, 4 mm jusqu'à 1 kg, 6 mm au-delà. Vérifie aussi que le poids partage le champ visuel de la dénomination.

*Données lues* : BAT : métriques de police + coordonnées.

### 🟩 6.3 — Le nombre de tasses annoncé correspond-il au poids net divisé par 2 g ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §3.2 ; §15

Divise le poids net par 2 g — la dose de référence du §3.2 — et compare au nombre de tasses annoncé. Un écart ne prouve pas une erreur : la dose peut être autre, et le § impose alors « x g » sur le logo tasse. Le constat donne la dose implicite. Une demi-tasse ne s'imprimant pas, l'arrondi de l'étiquetage est admis.

*Données lues* : Poids net + nombre de tasses de la fiche.

## 7. Conservation et mode d'emploi

### 🟦 7.1 — Mode d'emploi présent si nécessaire (nb sachets/cuillères, température, durée), sans recours exclusif à des symboles ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §5

Cherche sur le BAT les éléments du mode d'emploi écrits en toutes lettres — durée, température, dose. Le §5 n'impose pas les trois : il interdit de n'utiliser QUE des symboles. Un seul élément rédigé prouve la règle ; les autres sont nommés comme non retrouvés.

*Données lues* : BAT : mots et leur forme.

### 🟩 7.2 — Mention JDG « À conserver à l'abri de l'humidité, de la lumière et de la chaleur » présente ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §5

Vérifie la présence de la mention JDG « À conserver à l'abri de l'humidité, de la lumière et de la chaleur », sur la fiche puis sur le BAT, par ses mots invariants. Cherche en outre une mention distinguant la conservation APRÈS ouverture, que le §5 demande d'envisager.

*Données lues* : Mention de la fiche + texte du BAT.

## 8. Origine géographique

### 🟦 8.1 — Indication de l'origine des matières premières placée sous le code de l'organisme de contrôle, sous l'Eurofeuille ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §6 et §11.1

Mesure sur le BAT la position verticale de trois éléments : l'Eurofeuille, le code de l'organisme certificateur et la mention d'origine. Le §6 impose que l'origine figure sous le code, lui-même sous l'Eurofeuille. L'écart est donné en millimètres.

*Données lues* : BAT : coordonnées des mots et du tracé de l'Eurofeuille.

### 🟨 8.2 — Mention « Agriculture UE / non UE / pays » cohérente avec ≥ 98 % des matières premières de cette origine ?

**Voie** : Modèle · **Sans IA** : non  
**Référence** : PRO-QHS-013 §6 et §11.1

Relève la mention d'origine imprimée — « Agriculture UE/non UE », « Agriculture Inde »… — et la cite. Établir qu'elle reflète bien 98 % des matières premières demande l'origine de chaque matière, que l'application ne connaît pas encore : le point apporte le fait et laisse la conclusion.

*Données lues* : BAT : texte. Origine par matière première : absente.

### 🟨 8.3 — Mention volontaire d'origine réservée à un produit contenant > 50 % de cette origine ?

**Voie** : Modèle · *conditionnel* · **Sans IA** : non  
**Référence** : PRO-QHS-013 §6

Une mention volontaire d'origine n'est admise que si le produit contient plus de 50 % de cette origine. Le contrôle est confié à un modèle, faute de connaître l'origine de chaque matière.

*Données lues* : Origine par matière première : absente.

## 9. Fabricant

### 🟩 9.1 — Adresse JDG complète présente (LES JARDINS DE GAÏA – Z.A. – 6 rue de l'Écluse – FR-67820 Wittisheim + site web), sans code emballeur ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §7

Vérifie la présence de l'adresse complète des Jardins de Gaïa, par ses mots invariants, sur la fiche puis sur le BAT. La procédure précise que l'adresse internet seule ne suffit pas, et que le code emballeur n'est pas utilisé.

*Données lues* : Mention de la fiche + texte du BAT.

## 10. Gencode

### ⬜ 10.1 — Code-barres IMPRIMÉ sur le BAT identique au Gencode déclaré en fiche ?

**Voie** : Œil · **Sans IA** : non  
**Référence** : PRO-QHS-013 §8 ; annexe 4 ; MOP-PRO-029 §3

Comparaison du code-barres IMPRIMÉ au Gencode déclaré. Reste à l'œil : sur les 139 produits mesurés, aucun code-barres ne livre ses chiffres en texte — ils sont dessinés, vectorisés. Les décoder demanderait de lire les barres sur l'image rendue.

*Données lues* : BAT : aucune donnée exploitable aujourd'hui.

## 11. Métrologie

### 🟦 11.1 — Le « e » métrologique est-il bien ABSENT (politique JDG) ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §9

Cherche le signe métrologique « ℮ » dans le texte du BAT. Les Jardins de Gaïa ont décidé de ne pas l'apposer : le contrôle vérifie donc une ABSENCE, et le catalogue la confirme sur 139 produits sur 139.

*Données lues* : BAT : texte.

## 12. Pictogrammes

### ⬜ 12.1 — Triman présent, ≥ 1×1 cm (ou ≥ 0,6×0,6 cm si contrainte technique) ?

**Voie** : Œil · **Sans IA** : non  
**Référence** : PRO-QHS-013 §10.1 ; décret 2022-975

Présence et dimensions du Triman, au moins 1 × 1 cm, ou 0,6 × 0,6 cm en cas de contrainte technique. Un modèle de vision le cherche lors de l'analyse IA. Aucune empreinte de tracé correspondante n'a été trouvée sur les étiquettes examinées.

*Données lues* : BAT : reconnaissance d'image.

### ⬜ 12.2 — Cartouche Info-Tri complet (Triman + « le tri + facile » + éléments séparés par + + destination), règles de dématérialisation selon surface respectées ?

**Voie** : Œil · **Sans IA** : non  
**Référence** : PRO-QHS-013 §10.2 ; annexe 5 ; loi AGEC art. 17

Deux volets. Un modèle de vision cherche le cartouche Info-Tri et ses trois éléments. Le code, lui, mesure la surface de la face la plus grande et énonce le régime que le décret 2022-975 ouvre : dématérialisation totale sous 20 cm², du seul cartouche entre 20 et 40 cm², aucune au-delà.

*Données lues* : BAT : surface mesurée + reconnaissance d'image.

## 13. Labels et signes de qualité

### 🟦 13.1 — Eurofeuille présente, dimensions ≥ L 13,5 × H 9 mm (proportions 1/1,15), dans le même champ visuel que le code OC et l'origine ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §11.1 ; annexe 6

Reconnaît l'Eurofeuille à son tracé — le feuillage d'étoiles porte une empreinte vectorielle stable — puis mesure le champ vert qui l'englobe, identifié par les proportions du drapeau européen. Compare aux dimensions minimales : 13,5 × 9 mm, ou exactement 9 × 6 mm pour la dérogation « très petits emballages ». Sans modèle, et sans faux positif sur 111 contre-étiquettes.

*Données lues* : BAT : tracés vectoriels.

### 🟦 13.2 — Code de l'organisme de contrôle du dernier opérateur présent (FR-BIO-01) ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §11.1

Cherche le code de l'organisme certificateur du dernier opérateur — FR-BIO-01 chez les Jardins de Gaïa — dans le texte du BAT.

*Données lues* : BAT : texte.

### 🟨 13.3 — Labels non officiels (WFTO, Fairtrade, Elephant Friendly, FFL, Demeter…) justifiés par la matière première et correctement apposés ?

**Voie** : Modèle · **Sans IA** : non  
**Référence** : PRO-QHS-013 §11.2 ; annexe 7

Un modèle de vision reconnaît les logos non officiels — WFTO, Fairtrade, Elephant Friendly, Fair for Life — et juge s'ils sont justifiés par la matière première. Le code, en parallèle, vérifie la mention WFTO en deux marqueurs distincts : la phrase d'appartenance et l'adresse wfto.com, car trois étiquettes du catalogue portent la seconde sans la première.

*Données lues* : BAT : texte + reconnaissance d'image.

### ⬜ 13.4 — Logo Point Vert bien ABSENT (interdit depuis le 01/01/2021, loi AGEC) ?

**Voie** : Œil · **Sans IA** : non  
**Référence** : PRO-QHS-013 §11.2 ; loi 2020-105

Le logo Point Vert est interdit depuis le 1ᵉʳ janvier 2021. Le contrôle vise donc une absence — et une absence ne se prouve pas par empreinte : ne pas reconnaître un dessin ne dit pas qu'il n'y est pas. Il restera à l'œil.

*Données lues* : BAT : reconnaissance d'image.

## 14. Taille des caractères

### 🟦 14.1 — Hauteur de x des mentions obligatoires conforme à la face la plus grande (0,9 mm si < 80 cm² ; ≥ 1,2 mm si > 80 cm²) ?

**Voie** : Code · BAT · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §12 ; INCO art. 13.2/13.3/16.2

Mesure la hauteur de x réelle de chaque mention obligatoire sur le BAT, à partir du corps et des métriques de la police, et la compare au seuil que fixe la surface de la face la plus grande : 0,9 mm en dessous de 80 cm², 1,2 mm au-delà. Un mot dont la police n'a pas pu être lue retient le verdict ; une mention absente relève de son propre contrôle.

*Données lues* : BAT : métriques de police + surface.

## 15. Code étiquette

### 🟩 15.1 — Code étiquette présent sur la contre-étiquette ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : PRO-QHS-013 §13

Vérifie que le code étiquette figure sur la fiche, puis qu'il est imprimé sur la contre-étiquette. Quand la fiche est muette, le code lit le code imprimé — forme ET + famille + n° d'article + version — et le propose en un clic, à condition qu'il n'y en ait qu'un et que son n° d'article désigne bien ce produit.

*Données lues* : Code étiquette de la fiche + texte du BAT.

## 16. Code article et Gencode (MOP-PRO-029)

### 🟩 16.1 — Le code produit porte-t-il un chiffre de conditionnement (1 à 7) ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : MOP-PRO-029 §2.1.3

Vérifie que le code produit se termine par un chiffre de conditionnement de 1 à 7, comme l'impose le §2.1.3 du mode opératoire. Le 4ᵉ chiffre est un format d'emballage, pas un numéro de version.

*Données lues* : Code produit.

### 🟩 16.2 — Le chiffre de conditionnement correspond-il au poids net déclaré ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : MOP-PRO-029 §2.1.3

Confronte le chiffre de conditionnement au poids net déclaré : le 4 vaut 250 g, le 5 vaut 500 g, le 2 couvre 100 g ou tout poids d'au moins 80 g, le 6 les poids inférieurs à 80 g.

*Données lues* : Code produit + poids net.

### 🟩 16.3 — Le Gencode déclaré décode-t-il le même article et le même conditionnement, avec une clé valide ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : MOP-PRO-029 §3

Décode le Gencode déclaré et vérifie qu'il désigne le même article et le même conditionnement que le code produit, et que sa clé de contrôle est valide.

*Données lues* : Gencode + code produit.

### 🟩 16.4 — Le Gencode est-il porté par ce seul produit ?

**Voie** : Code · fiche · **Sans IA** : oui  
**Référence** : MOP-PRO-029 §3 ; GS1

Vérifie qu'aucun autre produit actif ne porte le même Gencode. L'unicité d'un GTIN ne se lit pas sur une fiche isolée : la requête fournit la liste des porteurs du même code.

*Données lues* : Gencode + catalogue des produits actifs.

---

## Ce qui n'est pas couvert, et pourquoi

Quatre exigences de PRO-QHS-013 n'ont aujourd'hui aucun contrôle, faute d'une
donnée que l'application ne détient pas :

| Exigence | Référence | Ce qui manque |
|---|---|---|
| Thé minoritaire (< 50 %) signalé en dénomination | §1.4 | Savoir quels ingrédients sont du Camellia sinensis |
| Pays ou région précisé pour les thés nature d'origine | §6 | L'origine de chaque matière première |
| Origine induite en erreur (terme ou image évoquant un lieu) | §6 | Un jugement, pas une mesure — relève d'un modèle |
| Date de durabilité minimale | §12 | Aucun champ dans l'application |

Et quatre contrôles sont écrits au registre mais ne rendent aucun verdict
aujourd'hui : **1.1** (marqueur Camellia jamais renseigné), **1.3** (drapeau
enfleurage inexistant), **10.1** (code-barres dessiné, illisible en texte sur
139 produits sur 139), **13.4** (prouver l'absence d'un logo demanderait de
reconnaître toutes ses variantes).

---

## Pour la mise en regard documentaire

Les références citées dans ce document renvoient à :

- **PRO-QHS-013** — Procédure de vérification d'étiquetage, Les Jardins de Gaïa,
  indice v. 1, mise à jour du 30/03/2023, 19 pages. Sections §1 à §15.
- **MOP-PRO-029** — Mode opératoire de création / modification d'une fiche
  article, indice v. 2. Sections §2.1 (code article) et §3 (Gencode).
- Textes cités par la procédure elle-même : règlement (UE) 1169/2011 (INCO),
  STEPI, décret 2022-975 (Triman / Info-Tri), loi 2020-105 (AGEC), manuel
  Eurofeuille, charte Demeter, WFTO Label and Mark Guidelines.
