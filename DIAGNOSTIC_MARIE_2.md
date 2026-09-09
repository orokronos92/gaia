# Diagnostic Marie — Phase 2 : levée des points par la lecture du code + la base

> Suite de `DIAGNOSTIC_MARIE.md`. Lecture seule sur `gaia_gamma` (code déployé). **Aucune modification de code, aucun commit, aucun rebuild.**
> Périmètre : la re-visualisation des documents sources (FD + recette) est **arbitrée hors CDC** — retirée des lots et des questions (sera couverte par une future UI comité de dégustation).
> Les données en base ont été lues via `SELECT` uniquement (aucune écriture DB) sur les 4 produits testés : TA6122, TA6212, TH511, TH1502.

---

## Point 1 — `estBio` vs `estDemeter` : le Lot 3 exige-t-il une migration ?

**Verdict : NON, pas de migration additive** — sous réserve d'une décision métier (voir plus bas).

- Aucun champ `estBio`/`bio`/`agricultureBiologique` nulle part. La table `ingredients_recette` (`schema.ts:145-164`) ne porte que 3 flags : `estDemeter`, `estEquitable`, `estCamellia` — tous `boolean default(false)`. Le générateur ne produit que `✱` (Demeter) et `°` (équitable), jamais le `*` bio ni la mention « *Issu de l'agriculture biologique. ».
- « ni Demeter ni équitable » **≠** « non bio » : le statut bio n'est pas modélisé au niveau ingrédient.
- **Info fiable disponible** = le *gate produit* : `codeOc` (`FR-BIO-01`), `mentionEcocert`, ou `"AB"` ∈ `labelsClient`/`labelsMP`. Un produit certifié → tous ses ingrédients agricoles portent le `*`. Format cible confirmé par la fixture `audit-visual-text.test.ts:42`.
- **Heuristique risquée** = « tout ingrédient bio par défaut » sans vérifier le gate (fausse pour un produit non certifié, ignore l'exception INCO des < 5 % d'ingrédients agricoles non-bio).

**⚠️ Angle mort révélé par la base** : sur les 4 produits de Marie, `code_oc`, `mention_ecocert`, `organisme_certificateur`, `labels_mp` et `labels_client` sont **TOUS VIDES** (voir Point 7). Donc le gate produit fiable **n'a aucune donnée** pour ces fiches. Conséquence : le marquage bio déterministe est **techniquement sans migration, mais fonctionnellement bloqué par le même trou de données que le Groupe A**. Il ne se débloque qu'avec (a) le peuplement des labels/certifs, ou (b) une décision métier « tous les produits JDG sont bio » (vrai en pratique pour JDG, 100 % bio, mais c'est un choix à assumer). → **Décision non technique requise.**

---

## Point 2 — Points de checklist orphelins : inventaire complet

**Verdict : sur 35 points annoncés, seuls 12 produisent un verdict automatique réel.** Les 23 autres (10 `llm` + 13 `manual`) ne remontent jamais avec leur `id`.

Architecture réelle = **3 flux disjoints**, un seul rebranché sur les `id` de la checklist :
1. **Voie déterministe** (`deterministic/index.ts`) — seule à émettre des `ControlResult` clés par `id`. Filtre `.filter(c => c.mode === "deterministic")` (`index.ts:70`) → **les points `llm` et `manual` sont écartés d'office**.
2. **Voie BAT** (`text/semantic/visual-robot` + `pictos`) — espace d'`id` séparé (`TXT_*`/`SEM_*`/`VIS_*`), **jamais réconcilié** avec les `id` de la checklist. Ne tourne qu'avec un PDF BAT dans MinIO.
3. **Legacy `AuditWorker`** — 5 `typeControle` figés, **hors panneaux de la fiche** (utilisé par snapshot re-audit `etiquettes.ts:199` + API mass-audit).

| id | libellé court | mode | exécuteur | remonte UI ? |
|---|---|---|---|---|
| 1.0 | Dénomination légale objective | llm | **NON** | non |
| 1.1 | Thé ≥ 51 % Camellia | deterministic | OUI `quid.ts` (`index.ts:32`) | auto |
| 1.2 | Mention aromatisé/goût/saveur | llm | **NON** | non |
| 1.3 | « parfumé » = enfleurage | llm | **NON** (ctx force NA) | non |
| 1.4 | Dénomination même champ visuel | manual | NON | non |
| 2.1 | Mot « ingrédients » avant liste | manual | NON | non |
| 2.2 | Ordre pondéral décroissant | deterministic | OUI `ingredients.ts` (`index.ts:35`) | auto |
| 2.3 | Mono-ingrédient liste omise | deterministic | OUI `ingredients.ts` (`index.ts:36`) | auto (WARNING systématique) |
| 2.4 | Étoiles bio/demeter | manual | NON | non |
| 3.1 | QUID % par ingrédient | deterministic | OUI `quid.ts` (`index.ts:37`) | auto |
| 3.2 | Règle d'arrondi | deterministic | OUI `quid.ts` (`index.ts:38`) | auto |
| 3.3 | Ajustement Σ=100 | deterministic | OUI `quid.ts` (`index.ts:39`) | auto |
| 4.1 | Nutrition — exemption | llm | **NON** | non |
| 4.2 | Nutrition — mention si modif | llm | **NON** | non |
| 5.1 | Allergènes | deterministic | OUI `particularites.ts` (`index.ts:40`) | auto (déclaration only, pas le gras) |
| 5.2 | Allégation santé | llm | **NON par id** (partiel via `SEM_ALLEGATION`) | si BAT PDF |
| 5.3 | Réglisse hypertension | deterministic | OUI `particularites.ts` (`index.ts:41`) | auto |
| 6.1 | Quantité nette en masse | deterministic | OUI `mentions.ts` (`index.ts:42`) | auto |
| 6.2 | Hauteur des chiffres | manual | NON | non |
| 7.1 | Mode d'emploi | llm | **NON** | non |
| 7.2 | Mention conservation JDG | deterministic | OUI `mentions.ts` (`index.ts:43`) | auto |
| 8.1 | Origine sous code OC | manual | NON | non |
| 8.2 | Agriculture UE ≥ 98 % | llm | **NON** | non |
| 8.3 | Origine volontaire > 50 % | llm | **NON** (ctx NA) | non |
| 9.1 | Adresse fabricant JDG | deterministic | OUI `mentions.ts` (`index.ts:44`) | auto |
| 10.1 | Structure Gencode | manual | **NON** (commentaire « vision-eligible » **mensonger**) | non |
| 11.1 | « e » métrologique absent | manual | NON | non |
| 12.1 | Triman | manual | partiel `pictos.ts:30` | si BAT PDF |
| 12.2 | Cartouche Info-Tri | manual | partiel `pictos.ts:31` | si BAT PDF |
| 13.1 | Eurofeuille | manual | partiel `pictos.ts:29` | si BAT PDF |
| 13.2 | Code OC (FR-BIO-01) | manual | **NON** (commentaire « vision-eligible » **mensonger**) | non |
| 13.3 | Labels non officiels | llm | **NON par id** (partiel `VIS_WFTO`, présence logo) | si BAT PDF |
| 13.4 | Point Vert absent | manual | partiel `pictos.ts:32` | si BAT PDF |
| 14.1 | Hauteur de x typographie | manual | NON | non |
| 15.1 | Code étiquette | deterministic | OUI `mentions.ts` (`index.ts:48`) | auto |

**Écart couverture affichée vs réelle :**
- **12/35** ont un exécuteur branché par `id` (les 12 déterministes, tous OK).
- **10 points `llm` = orphelins** : aucun n'est exécuté par son `id`. Totalement orphelins (aucune remontée) : `1.0, 1.2, 1.3, 4.1, 4.2, 7.1, 8.2, 8.3`. Orphelins par id mais couverture BAT tangentielle : `5.2` (via `SEM_ALLEGATION`), `13.3` (via `VIS_WFTO`, présence logo seule).
- **13 points `manual`** : aucun ne remonte en auto ; 4 ont une détection BAT si PDF (`12.1, 12.2, 13.1, 13.4`).
- **`10.1` et `13.2`** : leurs commentaires dans `control-checklist.ts` affirment « vision-eligible (visual robot) » alors qu'ils sont **absents de `PICTOS_A_DETECTER`** → promesse non tenue.

---

## Point 3 — Troncature du pitch : élucidée

**Verdict : troncature de DONNÉES à la source (~250 car., coupée en plein mot), aucune troncature dans notre code.**

- La chasse code est négative sur toutes les pistes : pas de `truncate`/`line-clamp`/hauteur fixe sur le pitch ni ses ancêtres (`EtiquetteClient.tsx:801-819`, `Card:683` a `overflow-hidden` mais **sans** hauteur → ne peut pas tronquer) ; `editable-section.tsx:170-171` rend un `<p>` nu ; pas de règle globale (`globals.css`, Tailwind v4) ; schéma `texteCommercialFr` = `text()` **illimité** (`schema.ts:165`) ; aucun `.slice`/`.substring`/`.max()` sur ce champ à l'extraction, la sauvegarde ou en base.
- **Preuve base** : les 4 pitches font **248 / 248 / 250 / 242** caractères et se terminent **en plein milieu d'un mot** (« …qu'affectionnent nos pe », « …arômes épicés du basilic sacré, soul », « …une infusion rouge grenat qui conc »). Un cap machine à ~250, pas une rédaction humaine.
- **Origine** : le pitch est lu **tel quel** depuis la colonne Excel `TEXTE COMMERCIAL FR` par le seed (`seed-real-data.ts:95`). L'import DOCX n'écrit jamais ce champ. → **La troncature est dans le fichier source « BDD étiquettes 2025 extrait dec 2025.xlsx »** (colonne pré-coupée à ~250), pas dans GaïaLabel.

**Conséquence** : aucun correctif CSS ni schéma ne règle ça. Il faut soit un ré-export de la BDD avec le pitch complet, soit sourcer le pitch depuis la FD/recette. **Marie a raison sur le symptôme, mais la cause est la donnée d'entrée.**

---

## Point 4 — Peuplement des logos / codes / EAN : bug ou décision d'archi ?

**Verdict : majoritairement une décision d'architecture, pas un bug.** Ces données n'existent que dans la BDD étiquettes Excel, hors du flux FD+recette de Marie.

| Donnée | Chemin possible | Verdict |
|---|---|---|
| `labelsMP` / `labelsClient` (logos AB/MH/WFTO/Demeter) | Import FD : prompt les demande (`importWorker.ts:240-241`), écriture existe (`:442-443, 685-686`), via cases `⟦SÉLECTIONNÉ⟧` | **Peut arriver par l'import** — MAIS conditionné à des cases cochées dans le DOCX. En base : **VIDE sur les 4** → la FD ne les portait pas / extraction muette |
| `codeEan` | Seed only (`seed-real-data.ts:81`, col Excel `CODE EAN`). Absent du schéma Zod d'import | **N'existe que dans la BDD Excel.** En base : **PRÉSENT sur les 4** (voir Point 7) — donc décision d'archi, et déjà là |
| `codeEtiquette` | Seed only (`:93`) | **BDD Excel only.** En base : **VIDE sur les 4** |
| `mentionEcocert` | Seed only (`:88`) | **BDD Excel only.** En base : **VIDE sur les 4** |
| « Anemos » | — | **Introuvable** dans tout le code |
| 3 codes facing / contre / sachet | — | **N'existent pas comme modèle** : une seule colonne `codeEtiquette`. « facing/contre » ne sont que des fixtures de tests d'audit visuel (`audit-visual-*.test.ts`) |

Note : la recette extrait `estDemeter`/`estEquitable` par ingrédient mais **ne les agrège jamais** vers `labelsMP`/`labelsClient` du produit — pas de pont recette → labels.

**Conclusion** : sauf les logos (qui *pourraient* passer par la FD si elle les portait), EAN / codeEtiquette / Ecocert **ne vivent que dans la BDD Excel**. Les faire apparaître dans le flux de Marie est un **choix d'architecture** (importer la BDD ? jointure vers une table BDD persistée ?), pas une correction de bug.

---

## Point 5 — Table `labels_produits` morte : réutiliser ou supprimer ?

**Verdict : vestige à supprimer** (sauf décision explicite d'une modélisation normalisée des labels).

- Introduite au **commit initial `bd2aca0`** (MVP). Colonnes (`schema.ts:123-128`) : `id`, `produitId` FK, `typeLabel varchar(100)` (« AB », « WFTO »…), `valeur varchar(255)` (« IGP Darjeeling »).
- **Intention documentée** (skill glossaire, `etiquette-domain-glossary/SKILL.md:75,105`) : associer un produit à ses certifications = **exactement le Groupe A**.
- **Morte confirmée** : hors déclaration + `delete` au seed (`:47`), aucun insert, aucun read dans tout `src/`. Pas de query associée.
- **Groupe A** : structure *adaptée* (un-à-plusieurs `typeLabel`/`valeur`), mais **le chemin vivant est déjà** `labelsMP`/`labelsClient` (JSON) — écrit par l'import, lu par l'UI, éditable. `labels_produits` est une coquille vide redondante. Manque un discriminant MP vs client.
- **Groupe C (mentions)** : structure *inadaptée* (pas de texte riche/langue/ordre/obligatoire). Précédent existant = colonnes dédiées sur `fichesEtiquettes` (`mentionConservation:175`, `mentionFabricant:176`).

**Recommandation** : supprimer `labels_produits` (+ régénérer le snapshot Drizzle) et rester sur les colonnes JSON pour A. Ne la ressusciter que si on décide d'une modélisation normalisée avec métadonnées par label.

---

## Point 6 — Effet de bord du garde `hasRealValue`

**Verdict : impact réglementaire limité à allergène + allégation ; aucun autre champ réglementaire masqué silencieusement.**

Définition (`EtiquetteClient.tsx:59-63`) : masque `/`, `aucun`, `néant`, `non`, `n/a`, `na`, `-`, vide. 5 sites d'appel :

| # | Ligne | Champ | Nature | Effet si sentinelle |
|---|---|---|---|---|
| 1 | 112 | `sousDesignationFr` | cosmétique | masqué si sousDes ET ingredients faux |
| 2 | 113 | `ingredients` (param) | serait réglementaire mais **INERTE** : `LanguageRow` appelé une seule fois (`:868`) avec `ingredients=""` codé en dur → garde **mort** | ne masque rien |
| 3 | 335 | `allergenes` → `hasAllergen` | **RÉGLEMENTAIRE** | bloc allergènes masqué en lecture |
| 4 | 336 | `allegationsSanteFr` → `hasAllegation` | **RÉGLEMENTAIRE** | bloc allégation masqué en lecture |
| 5 | 844 | `declinaisons` | cosmétique | bloc masqué |

Autres champs réglementaires (`mentionConservation:894`, `mentionFabricant:904`, `origine:501`) rendus **inconditionnellement** avec placeholder → jamais masqués par sentinelle. La réglisse n'est pas gérée dans l'affichage fiche.

**Conclusion** : Marie a bien identifié les deux seuls champs réglementaires concernés. Mais **Point 7 montre pourquoi c'est systématique** : `allergenes = "Aucun"` sur les 4 fiches, `allegations_sante_fr = "/"` sur 3/4 → ces blocs disparaissent sur quasiment toutes ses fiches, pas par hasard.

---

## Point 7 — État réel en base des 4 fiches : affichage vs données

Distinction champ par champ. **P** = présent en base, **VIDE** = absent en base, **⚠** = présent mais faux.

| Champ (retour Marie) | TA6122 | TA6212 | TH511 | TH1502 | Nature du problème |
|---|---|---|---|---|---|
| `code_ean` | P `3582810361221` | P | P | P | **Donnée présente, non affichée** → pur problème d'UI (Lot 1) |
| `code_etiquette` | VIDE | VIDE | VIDE | VIDE | **Absent en base** (import ne le peuple pas ; BDD Excel only) |
| `labels_mp` / `labels_client` | VIDE | VIDE | VIDE | VIDE | **Absent en base** (FD ne portait pas les cases) |
| `mention_ecocert` | VIDE | VIDE | VIDE | VIDE | **Absent en base** (BDD Excel only) |
| `code_oc` / `organisme_certificateur` | VIDE | VIDE | VIDE | VIDE | **Absent en base** (BDD Excel only) |
| `contient_reglisse` | f | f | f | f | Correct (aucun ne contient de réglisse) |
| `conditionnement` | ⚠ `Vrac` | ⚠ `Vrac` | ⚠ `Vrac` | ⚠ `Sachet format volumineux` | **Présent mais FAUX** (attendu « sachet ») → extraction (Lot 2). 4/4 faux |
| `plusieurs_infusions` | ⚠ `true` | ⚠ `true` | ⚠ `true` | ⚠ `true` | **Présent mais FAUX** (attendu « non ») → extraction. **4/4 faux** (Marie disait 3/4) |
| `volumineux` | VIDE | VIDE | VIDE | VIDE | **Absent en base** (non extrait). NB : TH1502 dit « format volumineux » dans `conditionnement` mais le flag reste null |
| `type_the_fr` | P `Mélange de thés aromatisé` | P `Thé vert parfumé` | P `Infusion de plantes` | P `Infusion de plante` | **Présent** → « tronqué » = CSS `truncate` (Lot 1) |
| `origine` | P `Inde - Chine - Vietnam` | P `Inde` | ⚠ `/` (sentinelle) | P `Egypte, Sénégal` | Présent sauf TH511 = `/` |
| `allergenes` | ⚠ `Aucun` | ⚠ `Aucun` | ⚠ `Aucun` | ⚠ `Aucun` | **Présent = « Aucun » → masqué par `hasRealValue`** sur les 4 (Lot 1) |
| `allegations_sante_fr` | `/` (masqué) | `/` (masqué) | `/` (masqué) | P (texte nutrition réel) | Masqué sur 3/4 (sentinelle) ; affiché sur TH1502 |
| `phrase_wfto_fr` | P | P | ⚠ `/` | P | WFTO OK sur 3/4 ; TH511 = `/` |
| `texte_commercial_fr` (pitch) | 248 c. tronqué | 248 c. | 242 c. | 250 c. | **Tronqué à la source** (Point 3) |
| `statut` | QUALITY_REVIEW | QUALITY_REVIEW | QUALITY_REVIEW | QUALITY_REVIEW | — |

**Synthèse Point 7 :**
- **Problème d'AFFICHAGE pur** (donnée en base) : `code_ean` (les 4), `type_the_fr`/`origine` tronqués, `allergenes="Aucun"` masqué. → Lot 1 les débloque réellement.
- **Problème de DONNÉES — extraction fausse** : `conditionnement` (4/4), `plusieurs_infusions` (**4/4**, pire que signalé). → Lot 2.
- **Problème de DONNÉES — réellement absent en base** : `code_etiquette`, `labels_*`, `mention_ecocert`, `code_oc`, `volumineux` (les 4). Afficher ne suffira pas — il faut d'abord peupler, ce qui renvoie à la décision d'archi du Point 4.
- **TH511 = fiche la plus dégradée** : `origine`, `phrase_wfto_fr`, `allegations_sante_fr` toutes à `/`. Une étiquette poussée en l'état serait non conforme, et l'app ne le signale pas (origine rendue « Non spécifiée »).

---

## Point 8 — Ce que le code/la base révèlent et que Marie n'a pas signalé

1. **`plusieurs_infusions` est faux de façon SYSTÉMATIQUE (4/4, pas 3/4).** Le biais d'extraction est structurel — même la fiche qu'elle croyait correcte est fausse. Impact réglementaire (mode d'emploi / nombre d'infusions sur l'étiquette).
2. **L'audit « 35 points » ne calcule en réalité que 12 verdicts.** Marie a vu « l'audit ne remonte rien » ; elle n'a pas vu que **même quand il tourne, les 2/3 de la checklist ne sont jamais évalués** (10 llm + 13 manual sans exécuteur par id). C'est un trou de couverture de conformité majeur, invisible depuis l'UI.
3. **Commentaires trompeurs `10.1` / `13.2`** : le code affirme une éligibilité vision non implémentée → **faux sentiment de couverture** sur le Gencode et le code OC (FR-BIO-01), deux points réglementaires.
4. **L'allergène « en gras » (INCO art. 21) n'est vérifié nulle part.** `5.1` ne contrôle que la *déclaration*, l'emphase est renvoyée au manuel. Si Marie se fie à l'audit, une non-conformité de mise en gras passe silencieusement.
5. **La mention bio « *Issu de l'agriculture biologique. » n'existe pas du tout** dans le système (Point 1) — pas seulement dans la liste d'ingrédients : c'est une mention INCO/bio obligatoire absente de bout en bout.
6. **Règles croisées inexistantes** : WFTO facing→contre-étiquette, double étoile Demeter, cohérence/clé du code EAN. Aucune n'est modélisée.
7. **Double source de vérité audit** : le legacy `AuditWorker` persiste encore des `controles_conformite` (QUID/ROUNDING/ALLEGATION/ALLERGEN/REGLISSE) via snapshot + mass-audit, en parallèle de la voie déterministe — risque de verdicts contradictoires.
8. **`origine` manquante non signalée** : TH511 a `origine = "/"`, rendu « Non spécifiée » sans alerte. L'origine est une mention réglementaire ; son absence devrait être un FAIL d'audit, pas un placeholder silencieux.

---

## Point 9 — Découpage en lots révisé

Changements clés vs Phase 1, à la lumière des investigations :

| Lot | Révision | Nouveau statut |
|---|---|---|
| **Lot 1 — Affichage** | Confirmé : `code_ean` bien en base (4/4), `allergenes="Aucun"` et `type_the`/`origine` en base → vrais gains d'affichage. **Décision à prendre** : « Aucun » et « / » doivent-ils s'afficher (allergène « Aucun » est une info valable) ? | **Reste n°1**, effort faible, ROI max |
| **Lot 2 — Extraction prompt** | **Remonte en priorité.** La base prouve un biais **systématique 4/4** sur `conditionnement` ET `plusieurs_infusions` (pire que le rapport de Marie). Effort faible, impact réglementaire. | **Monte n°2 → quasi ex-æquo n°1** |
| **Lot 3 — Ingrédients typo (dont bio)** | **Pas de migration** (gate produit). MAIS le gate n'a **aucune donnée** sur les 4 fiches (labels/certifs vides) → **bloqué par décision métier** « tous produits JDG bio ? » ou par le peuplement des certifs. La couche typo pure (préfixe, casse, italique, mono-ingrédient) reste faisable sans donnée. | **Scinder** : typo pure = faisable ; marquage bio = bloqué décision |
| **Lot 4 — Audit visible** | **Effort revu à la hausse.** Ce n'est pas qu'un rebranchement d'onglet : l'audit ne couvre que 12/35. « Le rendre utile » = exécuter des points llm + réconcilier les espaces d'id. Le check EAN reste un gain facile (donnée présente). Corriger d'abord les commentaires mensongers 10.1/13.2. | Effort moyen→élevé ; isoler le quick-win EAN |
| **Lot 5 — Ingrédients sémantique** | Inchangé : **bloqué** par l'absence de référentiel de libellés légaux ERP (aucune table `articles`). Décision non technique. | **Bloqué décision** |
| **Lot 6 (ex re-visualisation)** | **Supprimé** (hors CDC). | — |
| **Lot 7 — Schéma BDD** | Précisé : les 3 codes étiquette **n'existent pas** comme modèle ; `labels_produits` est un vestige à supprimer, pas à réutiliser. Surtout : ces données **ne vivent que dans la BDD Excel** → dépend de la **décision d'archi du Point 4** (importer la BDD ? jointure ?). | **Bloqué décision** (archi) |

**Ordre de rentabilité révisé :**
1. **Lot 2 — Corriger le prompt d'extraction** (conditionnement + plusieurs_infusions). Faible effort, corrige un faux systématique 4/4 à impact réglementaire. *Promu en tête.*
2. **Lot 1 — Débloquer l'affichage** (EAN, allergène « Aucun », dé-troncature, renommage sous-désignation, placement certif). Faible effort, gros effet perçu — mais trancher d'abord l'affichage des sentinelles.
3. **Lot 3a — Ingrédients, typo pure** (préfixe, casse, italique latin, mono-ingrédient). Moyen, sans dépendance donnée.
4. **Lot 4a — Quick-win audit** : check EAN déterministe + correction des commentaires 10.1/13.2 + rebranchement synthèse dans l'onglet Audit IA. Moyen.
5. **Lot 4b — Couverture audit llm/manual** (exécuteurs manquants, réconciliation id). Élevé.
6. **Lot 3b / 5 / 7 — bloqués décision** (voir ci-dessous).

---

## Lots bloqués par une décision NON technique (à formuler ensuite)

Sans rédiger les questions, les points de blocage identifiés sont :

- **D1 — Statut bio des produits** (bloque Lot 3b, marquage bio) : peut-on poser « tout produit JDG est bio » (gate universel) ou faut-il peupler `codeOc`/`mentionEcocert`/`labels` d'abord ? Les 4 fiches testées ont ces champs vides.
- **D2 — Source des données BDD étiquettes** (bloque Lot 7 et Groupe A/B/C) : EAN, code étiquette, Ecocert, logos, mentions ne vivent que dans l'Excel « BDD étiquettes ». Doit-il être importé/persisté et joint aux fiches, ou ces données doivent-elles transiter par la FD de Marie ?
- **D3 — Référentiel de libellés légaux ERP** (bloque Lot 5, sémantique ingrédients) : d'où viennent « arôme naturel de… », « thé noir », « pétales de fleurs » — table `articles` à créer, mapping manuel, ou LLM cadré ?
- **D4 — Affichage des sentinelles** (affine Lot 1) : « Aucun » (allergène) et « / » doivent-ils rester masqués ou s'afficher explicitement ?
- **D5 — Pitch tronqué à la source** (Point 3) : ré-exporter la BDD avec le pitch complet, ou re-sourcer le pitch depuis la FD ?

---

*Fin du diagnostic Phase 2. Aucune modification de code effectuée.*
