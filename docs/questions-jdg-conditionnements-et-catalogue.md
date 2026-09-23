# Questions aux Jardins de Gaïa — catalogue, conditionnements et étiquettes

**Ouvert le** : 2026-09-23 — **Par** : SPC — **À l'attention de** : Les Jardins de Gaïa
**Qui sait répondre** : la Qualité (base étiquettes), le Graphisme (fichiers), le
Conditionnement (formats et emballages).

Ce document rassemble ce que l'import de la « BDD étiquettes 2025 v2 » et des fichiers du
Graphisme n'a pas pu trancher avec certitude. Pour ne pas bloquer le travail, **SPC a pris
une décision provisoire sur chaque point**. Elle est indiquée sous la question et
s'applique jusqu'à votre réponse. Une réponse « oui, c'est bien ça » suffit dans la
plupart des cas.

Références détaillées : `docs/decisions/2026-09-23-constat-conditionnements.md` et
`docs/decisions/2026-09-23-import-bdd-v2-preprod.md`.

---

## A. Formats de vente (le 4ᵉ chiffre du code)

Nous lisons le 4ᵉ chiffre du code produit ainsi. **Confirmez-vous ?**

| Chiffre | Notre lecture | Exemple |
|---|---|---|
| 1 | vrac grand format (1,5 kg ; pour les plantes, 100 à 750 g) | TB4041 Ché Chun 1,5 kg |
| 2 | détail grand, ≈ 100 g (60 à 150 g selon la densité) | TB4042 Ché Chun 100 g |
| 6 | détail petit, ≈ 50 g (10 à 80 g selon la densité) | TB4046 Ché Chun 50 g |
| 5 | vrac 500 g | TN5505 Black Evidence 500 g |
| 7 | vrac 1 kg | TN5457 Banana Black 1 kg |
| 4 | boîte ou grand sachet | TJ1004 Kabuse Soshun 50 g, TL1004 Lapacho 250 g |
| 3 | exception | TO1143 Tie Guan Yin 7 g |

**A1.** Le chiffre **4** couvre-t-il deux choses différentes : les boîtes KEIKO de 50 g
(10 produits, sans référence d'étiquette) **et** les sachets de 250 g (Lapacho, Maté) ?
> Provisoire : un seul format « boîte ou grand sachet ».

**A2.** Pour les vracs, confirmez-vous qu'**aucun fichier du Graphisme n'est attendu**
(étiquette imprimée en interne, « INTERNE » dans la base) ?
> Provisoire : oui. Un BAT graphiste rattaché à un vrac est considéré comme une erreur de
> rattachement.

**A3.** Colonne poids « 80 → 50 », « 80 → 30 », « 80 → 35 » (TO1212, TO1192, TN5502,
TN5492, TV5022…) : est-ce un changement de format en cours ? Quel poids fait foi aujourd'hui ?
> Provisoire : le texte est gardé tel quel, sans poids numérique.

**A4.** Cas qui ne suivent pas la règle : `TJ0795`/`TJ0895` Shincha 50 g en chiffre 5,
`TO1145` Tie Guan Yin 56 g en 5, `TU0025` Peace, Love & Tea 125 g en 5, `TM1627` Épices
de Noël 35 g en 7, `TR2407` Rooibos sauvage 1,5 kg en 7, `TJ9051` Matcha Tradition 30 g en 1.
Erreurs de saisie ou vrais formats ?
> Provisoire : format lu dans le code ; ces produits sont signalés comme « à confirmer ».

**A5.** 13 vracs de plantes ont un poids « ? » (TH5051 Bonne humeur, TH1411 Bruyère…).
Quel est leur poids ?

**A6.** Les codes à 3 chiffres (`TH505` Bonne humeur, `MT265` Maté sportif, `TB715`…)
n'ont pas de chiffre de format. Quel est leur format ?
> Provisoire : « sans format ». Ils restent contrôlables normalement.

## B. Étiquettes et gabarits

Mesure faite sur les PDF : le 100 g et le 50 g d'un même thé ont **exactement la même taille
d'étiquette** (facing 55 × 135 mm, contre 55 × 95 mm). Seul le contenu de la contre change
(poids net, code-barres, nombre de tasses).

**B1.** Confirmez-vous qu'un **facing sans chiffre** (`ETBN404V6`) est commun au 100 g et
au 50 g, et que la **contre** (`ETCBN4042` / `ETCBN4046`) est propre à chaque format ?
> Provisoire : oui. C'est la règle appliquée au rattachement.

**B2.** Le mot « volumineux » désigne deux choses : la colonne « CONDITIONNEMENT EXPORT »
dit « Sachet format volumineux » pour les plantes (étiquette 70 × 120 / 70 × 100), et des
fichiers nommés « _Volumineux » (Ché Chun 100 g, Bai Mu Dan Premium, Avec les Anges) font
70 × 165. S'agit-il de deux sachets différents ? Quel est le nom exact de chacun ?

**B3.** Quels sont les **modèles de sachet** et leurs dimensions ? Nous connaissons
« SA9205 » (sachet standard) et « TU0001 » (tube). Une fiche technique emballage par modèle
permettrait de contrôler automatiquement la taille de chaque BAT.

**B4.** Grands Crus millésimés : `TN5502` Black Evidence a un BAT 2026 et deux BAT 2025.
Les BAT de l'année précédente sont-ils obsolètes dès que la nouvelle récolte est étiquetée ?
> Provisoire : seul le BAT de l'année la plus récente est actif.

**B5.** 313 PDF n'ont pas de zone de coupe : planches A3 d'infusettes, stickers Grands Crus
47 × 64 et 64 × 64. Pour les infusettes, quel fichier est l'étiquette de référence à
contrôler : l'étui (100 × 240), l'étiquette de sachet (20 × 56) ou la planche ?

**B6.** 40 produits ont une référence d'étiquette dans la base mais **aucun fichier** dans
l'envoi du Graphisme. Surtout des tubes : TUTA7252 Baiser gourmand, TUTR2322 Asimbonanga,
TUTV7352 Thé vert au jasmin… mais aussi COF1201-1203 (briques pu'er), TV134 Jade Dew,
TM1627. Liste complète : `docs/sources/rattachement-v2-produits-sans-bat.csv`.
Ces fichiers existent-ils ?

## C. Données de la base étiquettes

**C1.** 23 codes apparaissent **deux fois avec des contenus différents**. Lequel est le bon ?
TB7166, TM0206, TN2255, TN2256, TN2155, TN2156, TV1136, TA6692, TN5511, TA6261, TV1126,
TA6912, TN2032, TN2412, TR2372, TN2072, TA9012, TF1182, TN2365, TN2366, TV1056, TN2145, TN2146.
Exemples : TN2255 Full Moon Spirit en « Primeurs 2025 » et « Primeurs 2026 » ; TA6692
Instants divins avec les étiquettes `ETVA669V6` et `ETVA669V6N`.
> Provisoire : non importés. Détail colonne par colonne : `docs/sources/import-v2-mis-de-cote.csv`.

**C2.** Lignes non importées faute de donnée :
- TB8136 : type de thé vide ;
- TJ9202, TJ9204 (Matcha Latte), TJ9105 (Matcha Tsuki), TF134 (Quetschela) : gamme vide ;
- une ligne sans code ni dénomination ;
- une ligne « pétales de fleurs ».

**C3.** Codes au format inhabituel : `TUTJ0836A`, `TJ076A`, `TSTR2092V5`, `TSTA6132V5`.
Codes réels (le « A », le « V5 ») ou erreurs de saisie ?

**C4.** `TM1627` Épices de Noël figure dans l'onglet JDG **et** dans l'onglet Terra Madre.
À quelle marque appartient-il ?

**C5.** 18 produits portent « sans résidus de pesticide » dans la colonne AB, au lieu de
« AB » (TB9016 Tea Studio, TJ0795 Shincha, les tubes TUTJ…). Ces produits sont-ils bio ?
> Provisoire : non comptés comme AB.

**C6.** 25 produits n'ont pas de code EAN (vide ou « ? ») : TH1411, TH5011, TH5031,
TJ227, TJ228, TN305, TO205, TO206, TU5296…

**C7.** Signification des colonnes : **WT** et **EF** (labels ?), **IGP** quand elle contient
« SA » ou une médaille, **COND.** quand elle contient « Anemos », « TRIMAN » ou « TS0200 ».

**C8.** `MT2652` et `TA7372` figurent dans la base mais ont été supprimés de GaïaLabel.
Faut-il les recréer ?

## D. Gammes créées par l'import

Pour ne pas bloquer l'import, les libellés inconnus ont été **créés tels quels** dans le
référentiel. À ranger (fusionner, renommer ou rattacher) :

- gammes : KEIKO ; LES PRECIEUX ; LES PRECIEUX DU JAPON ; SDG GAIA - que BIOCOOP ;
- sous-gammes : LES MEDITATIONS et SELECTION DE NOËL (dans Grands Classiques) ;
  PRIMEURS 2024 et PRIMEURS 202x (dans Primeurs) ; PRIMEURS 2025 JAPON, PRIMEURS 2026 et
  PRIMEURS 2026 CHINE (dans Grands Crus) ; Matcha (dans Précieux du Japon et de Taïwan) ;
  PRIMEURS 2026 JAPON (dans Précieux du Japon) ; SELECTION DE NOËL (dans SDG GAIA).

Le référentiel contenait déjà des doublons de casse : « Grand classiques » /
« LES GRANDS CLASSIQUES », « LES ENGAGÉS » / « Les Engagés ».

## E. Fiches modifiées dans l'application

Sur 13 produits, 54 champs diffèrent entre l'application et la nouvelle base Excel. La
valeur de l'application a été **gardée**. Certaines viennent d'une extraction automatique
et sont probablement fausses : TA6122 « La balade du hérisson » a le type « Mélange de
plantes » dans l'application, « Mélange de thés aromatisé » dans la base.
Liste complète à relire : `docs/sources/import-v2-decisions.csv`.

## F. Contrôles calculés sur la base (sans avis extérieur)

**F1. Codes EAN partagés par deux codes produit** (20 cas). Certains ressemblent à un
renommage saisonnier du même thé (TA7481 Thé de Noël / TA7221 Thé d'hiver), d'autres à une
erreur. Deux produits différents, ou deux formats du même thé, ne peuvent pas porter le
même code-barres :

- **produits différents** : `3582810650219` TM0201 Avec les Anges / TA5021 Le secret des
  muses ; `3582810233979` TN3257 Gaïa Bari Potong / TN3397 Neiges de l'Himalaya ;
- **formats différents du même thé** : `3582810650714` TA5071 (1,5 kg) / TA5075 (500 g) ;
- **même thé, deux codes** : TR2212 / TR2492 Au coin du feu, TF1332 / TF1402 Féérie,
  TR2092 / TR2482 Lumière d'étoiles, TM1652 / TM1692 Masala pour Tchaï, TA5056 / TA5096
  Neige au soleil, TM1612 / TM1592 Épices vin chaud, TV1346 / TV134 Jade Dew,
  TB7156 / TB715 Silver Needle ;
- **tube et version Noël** : TU2092 / TSTR2092V5, TSTA5056 / TU5056 ;
- **renommages saisonniers probables** : TH5296 / TH5226 et TH5291 / TH5221 (tisane de Noël /
  d'hiver), TA6092 / TA6012 (Pomme de Noël / étoilée), TA6131 / TA6051 et TA6132 / TA6052
  (Surprise), TA7481 / TA7221 et TA7482 / TA7222 (Thé de Noël / d'hiver).

Quel code est actif pour chacun ?

**F2. Code EAN invalide** : `TJ508` Chocolat blanc au matcha porte `6676787690076`, dont la
clé de contrôle est fausse (et qui n'a pas le préfixe JDG 3582810).

**F3. Nombre de tasses incohérent** avec le poids et les grammes par tasse (519 produits
sur 522 sont cohérents) :
- TN4062 : 100 g à 2 g par tasse, 500 tasses indiquées (le calcul donne 50) ;
- TN4066 : 50 g à 2 g par tasse, 500 tasses (le calcul donne 25) ;
- TH1486 Feuilles de chanvre : 50 g à 2 g par tasse, 150 tasses (le calcul donne 25).

Plusieurs infusions par dose, ou erreur de saisie ?

## G. Textes envoyés à PMI

Pour PMI, chaque texte long est découpé en morceaux de 250 caractères (colonnes « 1-4 »,
« 2-4 »…). Recollés, ils doivent redonner le texte de l'étiquette. C'est vrai partout, sauf
sur **28 textes** :
- **26 textes commerciaux anglais** sont **vides** dans la colonne de l'étiquette mais
  **remplis** dans les morceaux PMI (TN2072, TN2235, TN2236, TN2366, TV1055…). Quel texte
  anglais est le bon ?
- **TN2256** : la colonne « liste d'ingrédients EN » contient le texte commercial, et le texte
  commercial est découpé ailleurs. Colonnes décalées ?
- **TN1062** : la liste d'ingrédients anglaise diffère entre l'étiquette et PMI.

Liste complète : `docs/sources/complements-v2-ecarts-pmi.csv`.
