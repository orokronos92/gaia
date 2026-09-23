# Mapping exhaustif de la BDD étiquettes v2 vers Postgres

**Date** : 2026-09-23 — **Statut** : à valider par Ouro avant la migration
**Principe (décision d'Ouro, 2026-09-23)** : la BDD v2 est la référence. **Chaque colonne
remplie de chaque onglet a une place en base**, même si l'application ne s'en sert pas
encore. Rien n'est perdu.

## 1. Trois destinations possibles

| Destination | Pour quoi | Exemple |
|---|---|---|
| **Champ typé** (produit ou fiche) | ce qui décrit le produit ou l'étiquette, et pourra être contrôlé | origine EN, texte tube, DLUO, tableau nutritionnel |
| **Suivi de fabrication** (nouvelle table, une ligne par fiche) | l'avancement chez JDG : finalisé, imprimeur, PMI, commentaires | ETIQ FINALISEE, IMPRIMEUR, HISTORIQUE |
| **Ligne source** (nouvelle table, la ligne Excel brute en JSON) | tout, tel quel, pour la traçabilité, y compris ce qui n'a pas de champ | les morceaux « 1-4 / 2-4 », « Colonne1 » |

La **ligne source** garantit qu'aucune cellule n'est perdue : chaque ligne de chaque onglet
est gardée intégralement (fichier, onglet, numéro de ligne, code, JSON des cellules). Les
champs typés sont une lecture de cette ligne.

Légende : ✅ déjà en base · 🆕 champ à créer · 📋 table de suivi · 📦 ligne source seulement.

## 2. Onglet JDG (881 lignes, 91 colonnes remplies)

### Produit

| Colonne Excel | Destination |
|---|---|
| CODE PF | ✅ `codePf` |
| GAMME / SOUS GAMME | ✅ `gammeId` / `sousGammeId` |
| DÉNOMINATION FR / SOUS-DÉS FR / TYPE DE THÉ FR | ✅ `denominationFr` / `sousDesignationFr` / `typeTheFr` |
| ORIGINE DU THÉ | ✅ `origine` |
| AB, WFTO, D, WT, IGP, EF | ✅ `labelsClient` (+ valeurs hors label → anomalies) |
| ECOCERT | ✅ `mentionEcocert` |
| POIDS G OU KG · TPS MIN D'INFUSION · T° C INFUSION | ✅ `poidsNet` · `tempsInfusion` · `tempInfusion` |
| POIDS EN G/TASSE DE 25 CL · NBRE DE TASSES | ✅ `poidsTasse` · `nbTasses` |
| CODE EAN · PLUSIEURS INFUSIONS · Aromatisé | ✅ `codeEan` · `plusieursInfusions` · `estAromatise` |
| PRODUCTEUR/ JARDIN | ✅ `producteurJardin` |
| DENOMINATION EN / SOUS-DÉS EN / TYPE DE THE EN | ✅ `denominationEn` / `sousDesignationEn` / `typeTheEn` |
| CONDITIONNEMENT EXPORT | ✅ `emballage` (migration 0027) |
| ORIGINE EN | 🆕 `origineEn` |
| ECOCERT EN | 🆕 `mentionEcocertEn` |
| POIDS NET oz | 🆕 `poidsNetOz` |
| EXPORT ANGLAIS (x) | 🆕 `exportAnglais` (booléen) |
| CODE PF EXPORT ANGLAIS | 🆕 `codePfExport` |
| COND. (Anemos, TRIMAN, TS0200) | 🆕 `cond` (texte brut ; sens à confirmer, question C7) |
| Priorité | 🆕 `priorite` |

### Fiche étiquette

| Colonne Excel | Destination |
|---|---|
| NOUVEAU TEXTE COMMERCIAL FR · …COURT POUR ETIQUETTES GRANDS CRUS | ✅ `texteCommercialFr` · `texteCommercialCourtFr` |
| TEXTE ASSOCIATION LES ENGAGES 185 car. | ✅ `phraseEngagesFr` |
| LISTE D'INGRÉDIENTS FR · ALLERGENES · ALLÉGATIONS SANTÉ FR | ✅ `ingredientsFr` · `allergenes` · `allegationsSanteFr` |
| PHRASE WFTO FR | ✅ `phraseWftoFr` + `statutWfto` |
| REF FACING 2025 · RÉF CONTRE 2025 | ✅ `refFacing` · `refContre` (+ `codeEtiquette`) |
| NOUVEAU TEXTE COMMERCIAL EN · LISTE INGREDIENTS EN · ALLÉGATIONS SANTÉ EN | ✅ champs `…En` |
| SOUS DES / LISTE INGREDIENTS DE, IT, NL | ✅ champs `…De/It/Nl` |
| ANCIEN TEXTE COMMERCIAL FR | 🆕 `ancienTexteCommercialFr` (historique du texte) |
| RÉF FACING (ancienne, ex. `SANM7882V6`) | 🆕 `refFacingPrecedente` |
| TEXTE COMMERCIAL EN COURT | 🆕 `texteCommercialCourtEn` |
| TEXTE ASSOCIATION LES ENGAGES (bloc EN) | 🆕 `phraseEngagesEn` |
| TEXTE PRESENTATION JDG (anglais) | 🆕 `textePresentationEn` |
| Texte TUBE (anglais) | 🆕 `texteTubeEn` |
| Code étiquette EXPORT · Code contre-étiquette EXPORT | 🆕 `refFacingExport` · `refContreExport` |

### Suivi de fabrication 📋

PRÊT POUR AURELIEN/INTERNE · ETIQ FINALISEE · CONTRE FINALISEE · IMPRIMEUR · ENVOI A
L'IMPRIMEUR (date) · PMI OK POUR PROJET PLANTES · PMI F9 NOUVEAU TEXTE COMMERCIAL · DATE
MODIFICATION PMI F9 (date) · SONNENTOR · PREMIER LOT EN V5 · BIOCOOP · ACTION · COMMENTAIRES
· HISTORIQUE.

Les dates Excel (45383) sont converties en vraies dates.

### Ligne source seulement 📦

- **« 1-4 / 2-4 / 3-4 » (textes, ingrédients, allégations, WFTO, FR et EN)** : ce sont les
  mêmes textes, découpés en morceaux de 250 caractères pour PMI. Pas de champ, mais un
  **contrôle** : les morceaux recollés doivent redonner le texte complet. Un écart signifie
  que PMI a une version différente de l'étiquette.
- **Colonne1** (une seule cellule remplie).

## 3. Onglets Infusettes (Pages : 22 lignes · Country Farm : 48 lignes)

Produits JDG d'un autre type : une boîte d'infusettes. Mêmes champs que JDG quand la
colonne existe (dénomination, type, sous-dés, FR/EN, origine, labels, Ecocert, infusion,
EAN, ingrédients FR/EN/DE/IT/NL, phrase WFTO), plus :

| Colonne Excel | Destination |
|---|---|
| QTÉ/BOÎTE · QUANTITE PAR BOÎTE | 🆕 produit `quantiteParBoite` |
| POIDS NET INFUSETTE EN GRAMME | 🆕 produit `poidsUnitaire` |
| POIDS NET DE LA BOITE · NET WEIGHT | ✅ `poidsNet` · 🆕 `poidsNetOz` |
| DLUO (36 / 48 mois) | 🆕 produit `dureeConservation` |
| CONDITIONNEMENT · EMBALLAGE | ✅ `emballage` |
| code MP · MP (Country Farm) | 🆕 produit `codeMp` · `designationMp` (lien vers la recette du thé en vrac) |
| ORIGINE DES MATIERES PREMIERES | ✅ `mentionEcocert` |
| LISTE D'INGRÉDIENTS ES · SV | 🆕 fiche `ingredientsEs` · `ingredientsSv` |
| TEXTE SITE INTERNET FR | 🆕 fiche `texteSiteFr` |
| TEXTE THÉ NATURE FR | 🆕 fiche `texteTheNatureFr` |
| TEXTE FOND ÉCO-EMBALLAGE FR | 🆕 fiche `texteEcoEmballageFr` |
| TEXTE ARRIÈRE FR (MANIFESTE) | 🆕 fiche `texteManifesteFr` |
| PAVÉ INFO TRI + TRIMAN · LABEL FSC | 🆕 fiche `paveInfoTri` · `labelFsc` (booléens) |
| SITE INTERNET · OUVERTURE | 🆕 fiche `siteInternet` · `mentionOuverture` |
| PAVÉ ADRESSE | ✅ `mentionFabricant` |
| À cons. de préf. av. / N° lot | 🆕 fiche `mentionDdm` |
| COND. (« Conditionné en France ») | 🆕 fiche `mentionConditionnement` |
| IMPRIMEUR · ENVOI A L'IMPRIMEUR · NOTE | 📋 suivi |
| morceaux « 1-4 : … », Colonne3 | 📦 + contrôle de recomposition |

## 4. Onglet Terra Madre (172 lignes, marque TERRA_MADRE)

| Colonne Excel | Destination |
|---|---|
| CODE PF · GAMME | ✅ `codePf` · `gammeId` (gammes Terra Madre à créer) |
| DÉNOMINATION PRINCIPALE · 1ÈRE SOUS-DÉS | ✅ `denominationFr` · `sousDesignationFr` |
| DÉNOMINATION SECONDAIRE · 2ÈME SOUS-DÉS | ✅ `denominationEn` · `sousDesignationEn` |
| ORIGINES · AB, WFTO, D, IGP (IGP ou **AOP**) · ECOCERT | ✅ `origine` · `labelsClient` · `mentionEcocert` |
| POIDS G OU KG · POIDS OZ · CODE EAN · PACK. | ✅ `poidsNet` · 🆕 `poidsNetOz` · ✅ `codeEan` · ✅ `emballage` |
| TEXTE ÉTIQ FR / EN | ✅ `texteCommercialFr` / `texteCommercialEn` |
| TEXTE SITE | 🆕 fiche `texteSiteFr` |
| LISTE D'INGRÉDIENTS FR / EN / DE / NL | ✅ champs `ingredients…` |
| INFORMATIONS NUTRITIONNELLES | 🆕 fiche `tableauNutritionnel` |
| PHRASE WFTO FR / EN | ✅ `phraseWftoFr` · 🆕 `phraseWftoEn` |
| RÉF ÉTIQ FACING · RÉF ÉTIQ CONTRE | ✅ `refFacing` · `refContre` (format `ET00701`, propre à Terra Madre) |
| BANDEAU FACING HAUT · BAS | 🆕 fiche `bandeauFacingHaut` · `bandeauFacingBas` |
| PAVÉ ADRESSE (bloc certification Ecocert) | 🆕 fiche `paveCertification` |
| ACTION (Great Taste 2017, Meilleur Produit Bio…) | 🆕 produit `distinctions` |

## 5. Onglets complémentaires (ne créent pas de produit)

**FR et EN** (392 lignes, traductions de produits JDG) : DÉNOMINATION / SOUS-DÉS / TYPE /
ORIGINE EN, TEXTE TRADUIT ANGLAIS, textes Engagés FR et EN, ingrédients EN, allégations EN
→ mêmes champs `…En` que l'onglet JDG. « DÉNOMINATION EN dans notre BDD actuelle » →
🆕 `denominationEnPrecedente`. Gamme Export, PRIORITE, Switch dans PMI, Mise à jour des
autres langues → 📋 suivi.

**CODE ARTI EXPORT** (79 lignes) : code export, libellé PMI, codes étiquette export,
conditionnement → mêmes champs export que JDG ; 🆕 produit `libellePmi`.

**FT** (une fiche technique isolée) : 📦 ligne source seulement.

## 6. Décisions à prendre avant la migration

1. **La ligne source brute (JSON)** : d'accord pour la garder pour chaque ligne de chaque
   onglet ? C'est ce qui garantit « rien n'est perdu ».
2. **Suivi de fabrication dans une table à part** plutôt que sur la fiche : d'accord ? Il
   change souvent et ne décrit pas l'étiquette.
3. **Terra Madre n'a pas de « type de thé »**, champ obligatoire aujourd'hui. Le rendre
   facultatif, ou y mettre la gamme (« LES POIVRES ») ?
4. **Onglet JDG contre onglet FR et EN** : quand les deux donnent une traduction différente
   pour le même produit, lequel fait foi ? Proposition : FR et EN, qui est le chantier de
   traduction, et l'écart est listé.
5. **Terra Madre** : ses 10 gammes (MY FRENCH RUBS, LES POIVRES, ÉPICES…) sont créées dans
   le référentiel, rattachées à la marque.
