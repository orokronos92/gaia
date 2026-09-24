# Correspondance BDD v2 (onglet JDG) ↔ fiche produit

**Date** : 2026-09-23 — **Statut** : constat, rien n'est modifié
**Principe (Ouro)** : correspondance, pas destruction. Les extractions existantes (fiche
descriptive DOCX, fiche recette XLSX, dégustation) restent intactes ; l'Excel alimente les
mêmes champs quand ils correspondent et s'ajoute à côté quand ils n'existaient pas.

Légende des extractions qui écrivent aussi le champ :
**A** import initial (fiche descriptive / dégustation) · **B** fiche recette XLSX ·
**C** ré-intégration dégustation · — aucune.

Constat : ✅ bien affiché · 📍 affiché ailleurs qu'attendu · 🏷️ libellé trompeur ·
🙈 en base mais jamais affiché.

## Produit

| Colonne Excel | Champ | Où sur la fiche | Extr. | Constat |
|---|---|---|---|---|
| CODE PF | `code_pf` | en-tête « Réf. » | A | ✅ |
| GAMME / SOUS GAMME | `gamme_id`, `sous_gamme_id` | en-tête | A (sans id) | ✅ |
| DÉNOMINATION FR | `denomination_fr` | titre | A | ✅ |
| SOUS-DÉS FR | `sous_designation_fr` | Base documentaire › Sous-dénomination FR | A | ✅ (non modifiable) |
| TYPE DE THÉ FR | `type_the_fr` | Identité › Type de thé | A | ✅ |
| ORIGINE DU THÉ | `origine` | Identité › Origine | A | ✅ |
| POIDS G OU KG | `poids_net` | Identité › Poids net, suivi de « g » | A | 🏷️ un vrac à « 1.5 » s'affiche « 1.5 g » |
| TPS MIN D'INFUSION | `temps_infusion` | Conseils › Infusion | A | ✅ |
| T° C INFUSION | `temp_infusion` | Conseils › Température | A | ✅ |
| NBRE DE TASSES | `nb_tasses` | Conseils › « Tasses / Cuillères » | — | ✅ |
| PLUSIEURS INFUSIONS | `plusieurs_infusions` | Conseils › Plusieurs infusions | A | ✅ (non modifiable) |
| CODE EAN | `code_ean` | Base documentaire › Gencode | — | ✅ |
| AB, WFTO, D, WT, IGP, EF | `labels_client` | Données complémentaires › Labels client | A | 📍 la carte Identité montre « Labels matière première » (autre champ, vide) |
| PRODUCTEUR/ JARDIN | `producteur_jardin` | Données complémentaires › Jardin | A | 📍 la carte Identité lit `info_producteur` → « non renseigné » |
| Aromatisé | `est_aromatise` | Données complémentaires › Aromatisé | A | 📍 |
| ECOCERT | `mention_ecocert` | — | — | 🙈 |
| POIDS EN G/TASSE DE 25 CL | `poids_tasse` | — | — | 🙈 |
| DENOMINATION EN / SOUS-DÉS EN / TYPE DE THE EN | `denomination_en`, `sous_designation_en`, `type_the_en` | — | — | 🙈 |
| ORIGINE EN · ECOCERT EN · POIDS NET oz | `origine_en`, `mention_ecocert_en`, `poids_net_oz` | — | — | 🙈 |
| EXPORT ANGLAIS · CODE PF EXPORT ANGLAIS | `export_anglais`, `code_pf_export` | — | — | 🙈 |
| CONDITIONNEMENT EXPORT | `emballage` | — (la carte montre `conditionnement`, écrit par A) | — | 🙈 |
| COND. · Priorité | `cond`, `priorite` | — | — | 🙈 |
| (format de vente, calculé du code) | `format_vente_id` | — | — | 🙈 |

## Fiche étiquette

| Colonne Excel | Champ | Où sur la fiche | Extr. | Constat |
|---|---|---|---|---|
| LISTE D'INGRÉDIENTS FR | `ingredients_fr` | Base documentaire › encart **« Rappel dégustation »** ; onglet Recette / QUID pré-rempli **seulement si la liste contient des %** | A, C | 🏷️ c'est la liste de l'étiquette, pas un rappel de dégustation ; onglet Recette vide pour une liste sans % (TB4042 « thé blanc* ») |
| NOUVEAU TEXTE COMMERCIAL FR | `texte_commercial_fr` | Base documentaire › Pitch commercial FR | — | ✅ |
| …COURT POUR ÉTIQUETTES GRANDS CRUS | `texte_commercial_court_fr` | Base documentaire › Texte court | — | ✅ |
| TEXTE ASSOCIATION LES ENGAGES | `phrase_engages_fr` | Base documentaire › Mention Les Engagés | — | ✅ |
| PHRASE WFTO FR | `phrase_wfto_fr`, `statut_wfto` | Base documentaire › Mention WFTO | — | ✅ |
| ALLERGENES | `allergenes` | Vigilance › Allergènes | A, C | ✅ |
| ALLÉGATIONS SANTÉ FR | `allegations_sante_fr` | Vigilance › Allégations | A, C (y écrivent toutes les options jointes) | ✅ |
| REF FACING 2025 / RÉF CONTRE 2025 | `ref_facing`, `ref_contre` → `code_etiquette` | Base documentaire › Code étiquette (la contre seulement) | — | 📍 les deux références ne sont pas montrées |
| NOUVEAU TEXTE COMMERCIAL EN · LISTE INGREDIENTS EN · ALLÉGATIONS SANTÉ EN | champs `…_en` | — | — | 🙈 |
| SOUS DES / LISTE INGREDIENTS DE, IT, NL | champs `…_de/_it/_nl` | — (chargés, jamais montrés) | — | 🙈 |
| ANCIEN TEXTE COMMERCIAL FR | `ancien_texte_commercial_fr` | — | — | 🙈 |
| RÉF FACING (ancienne) | `ref_facing_precedente` | — | — | 🙈 |
| TEXTE COMMERCIAL EN COURT · TEXTE ASSOCIATION (EN) · TEXTE PRESENTATION JDG · Texte TUBE | `texte_commercial_court_en`, `phrase_engages_en`, `texte_presentation_en`, `texte_tube_en` | — | — | 🙈 |
| Code étiquette / contre-étiquette EXPORT | `ref_facing_export`, `ref_contre_export` | — | — | 🙈 |

## Suivi de fabrication (table à part)

PRÊT POUR AURELIEN/INTERNE · ETIQ FINALISEE · CONTRE FINALISEE · IMPRIMEUR · ENVOI A
L'IMPRIMEUR · PMI OK · PMI F9 · DATE MODIF PMI F9 · SONNENTOR · PREMIER LOT EN V5 · BIOCOOP ·
ACTION · COMMENTAIRES · HISTORIQUE → `suivi_fabrication` → **🙈 aucun écran**.

## Cartes sans source dans l'Excel (alimentées par les extractions)

À garder telles quelles : elles se remplissent quand un document est déposé.

| Carte / bloc | Source |
|---|---|
| Identité › Organisme certificateur, Producteur (`info_producteur`), Origine MPA, Époque, Technique, Grade, Volumineux, Labels matière première | A (fiche descriptive) |
| Grille organoleptique & dégustation | A, C (`fiches_degustation`) |
| Recette de production, Recette étiquette, onglet Recette / QUID | B (fiche recette XLSX) |
| Vigilance › options d'allégations | A |
| Données complémentaires › FLO ID, Nom latin, Fournisseur, N° de lot | A |

## Points de vigilance pour faire cohabiter Excel et extractions

1. **A (import initial) avec « écraser »** réécrit toutes les colonnes du produit, vides
   comprises, et crée une **nouvelle fiche** à chaque fois (c'est l'origine des doublons de
   fiches vus en préprod).
2. **C (ré-intégration dégustation)** écrase les champs produit par ce qu'elle extrait, et
   `ingredients_fr` s'il n'y a pas de recette validée.
3. **Les imports Excel écrasent sans condition** les champs qu'ils portent.

Il faudra décider, champ par champ, quelle source prime une fois l'Excel abandonné.

## Étape 2 livrée (2026-09-24)

Recâblage des cartes existantes, vérifié à l'écran sur TB4041, TB4042 et TA6262 :

- **Identité** : poids net en kg pour le vrac, en g sinon (TB4041 « 1,5 kg ») ; mention
  d'origine (colonne ECOCERT, « Agriculture Vietnam ») ; bloc **Producteur & sourcing** avec
  le jardin de l'Excel (`producteur_jardin`) et, s'il diffère, le producteur de la fiche
  descriptive ; FLO ID, nom latin, fournisseur, mise en marché ; **Aromatisé** ; les
  **labels de l'Excel** (AB, WFTO, WT…) en grand, ceux de la matière première en petit s'il
  y en a. Tout est modifiable depuis la carte.
- **Conseils** : poids par tasse de 25 cl.
- **Base documentaire › Identifiants** : réf. facing, réf. contre, code étiquette imprimé,
  Gencode (TB4042 : ETBN4042V6 / ETCBN4042V6).
- **Vigilance** : l'allégation retenue par la fiche descriptive quand il n'y a pas d'options.
- **Dégustation** : le n° de lot dans l'en-tête.
- **Champ vide** : « non renseigné » en gris italique partout ; l'exemple de saisie ne
  s'affiche plus comme une valeur.
- **Carte « Données complémentaires & arbitrages » supprimée**, son contenu est réparti
  ci-dessus. Les champs des extractions sont conservés.

## Étape 3 livrée (2026-09-24)

Trois cartes en lecture seule sous « Mentions légales », repliables, marquées « base
étiquettes · lecture seule ». Elles ne montrent que les champs remplis, sauf les champs
attendus (dénomination, sous-dénomination, type de thé, texte commercial et liste en
anglais ; export anglais et code PF export), qui disent « non renseigné » :

- **Traductions** : anglais complet (y compris origine, mention d'origine, ancienne
  dénomination, texte de présentation, texte tube) ; allemand, italien, néerlandais quand
  la base en porte (17 fiches), sinon une ligne qui le dit.
- **Export** : export anglais, code PF export, réf. facing / contre export, conditionnement
  export, poids en oz, gamme et priorité export ; « Pas d'export anglais » sinon.
- **Suivi de fabrication** : étiquette (prêt pour l'interne, finalisée, contre, action,
  note), impression (imprimeur, date d'envoi, premier lot V5), PMI (libellé, OK projet
  plantes, F9, date, switch, langues), clients (Sonnentor, Biocoop), colonnes à confirmer
  (COND., priorité), historique (commentaires, historique, ancienne réf. facing, ancien
  texte commercial).

Vérifié sur TB4042, TA6262 et TUTA7452 (seul produit à cumuler DE/IT/NL et export). La
lecture de TB4042 a fait apparaître un texte anglais copié d'un wulong : question L1.
