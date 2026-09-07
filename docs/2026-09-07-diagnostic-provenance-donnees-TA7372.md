# Diagnostic — provenance des données de la fiche TA7372

**Date** : 7 septembre 2026
**Application** : GaïaLabel (Next.js 16 / Drizzle / PostgreSQL / Mistral)
**Produit examiné** : TA7372 — « Malin comme un chimpanzé », thé noir aromatisé
figue / miel / thym, Les Jardins de Gaïa

> **Objet.** Une expertise externe sur les BAT a montré que plusieurs valeurs de
> la fiche produit en base n'existent dans aucun document source. Ce document
> établit d'où vient chaque valeur, avant toute correction.
>
> **Méthode.** Lecture du code, requêtes en lecture seule sur la base de
> production, comparaison avec les sauvegardes antérieures et avec le classeur
> de référence MT265. **Aucune modification, aucune correction proposée.**

---

## Résumé

| Question posée | Réponse établie |
|---|---|
| Les pourcentages 38.5 / 19.5 / 4.5 / 0.5 sont-ils hallucinés par le LLM ? | **Non.** Ils sont calculés par notre propre moteur, correctement, avec un pas d'arrondi inadapté à ce produit. |
| Le `°` après `SORWATHE OP1` est-il une coquille ? | **Non.** C'est le marqueur « commerce équitable » ajouté à la génération du texte. |
| Les champs vides viennent-ils d'un écrasement par l'extraction ? | **Non.** Ils viennent de la suppression volontaire du produit avant le test. Le seed initial était juste sur tous les points vérifiables. |
| Existe-t-il malgré tout un risque d'écrasement ? | **Oui**, sur le chemin de création — pas sur celui de réintégration. |
| Le texte du BAT perd-il le « M » de « Malin » ? | **Oui, reproduit.** Limitation de la bibliothèque `pdf2json`. |
| Les verdicts du modèle de vision sont-ils conservés ? | **Non.** Seuls les compteurs de jetons le sont. |

**Cause racine principale** : le pas d'arrondi QUID est une constante figée à 0,5
dans le code, calée sur un unique produit de référence (MT265) puis généralisée.
La colonne « % pour liste d'ingrédient » du classeur R&D, qui donne la réponse
attendue, n'est jamais lue.

---

## 1. Pourcentages de la recette

### 1.1 Chemin de code

```
src/app/actions/import.ts:36-46                  Server Action, formData "recette"
  └─ src/agents/imports/recetteExtractor.ts:104  extraireRecetteDepuisXlsx()
       ├─ xlsxVersTexte()          ligne 38      classeur → texte tabulé
       ├─ callMistral()            ligne 109     appel LLM (mistral-large-latest)
       ├─ recetteExtraiteVersInput() ligne 79    mapping extraction → entrée moteur
       └─ computeRecette()         src/lib/business-rules/recette.ts:178
```

### 1.2 Les nombres ne viennent pas du modèle

Le classeur est lu par **SheetJS** (`xlsx@0.18.5`), rendu en texte, puis envoyé à
Mistral. **Le LLM n'extrait que les kilos.** Les pourcentages sont recalculés en
code :

```ts
// recetteExtractor.ts:126
return computeRecette({ ingredients, precisionArrondi: PRECISION_PAR_DEFAUT });
```

Contenu réel de la table `ingredients_recette` pour ce produit :

| designation | quantite_kg | pourcentage_brut | pourcentage_etiquette |
|---|---|---|---|
| SORWATHE OP1 | 6 | 38.462 | **38.5** |
| HONEYBUSH | 5 | 32.051 | 32 |
| MORCEAUX DE FIGUE | 3 | 19.231 | **19.5** |
| AROME BIO 2022 figue | 0.72 | 4.615 | **4.5** |
| AROME BIO 2022 miel | 0.64 | 4.103 | 4 |
| THYM | 0.14 | 0.897 | 1 |
| pétales de souci | 0.1 | 0.641 | **0.5** |

Le LLM a lu les kilos justes (total 15,6 kg), et les `pourcentage_brut`
reproduisent exactement la colonne « QTÉ EN % » de l'onglet **v.2** du classeur
(38.46 / 32.05 / 19.23 / 4.62 / 4.10 / 0.90 / 0.64).

### 1.3 D'où sortent 38.5 / 19.5 / 4.5 / 0.5

De `arrondiPlusGrandReste()` (`recette.ts:104`) — méthode du plus grand reste
(Hamilton) — appelée avec un pas figé :

```ts
// recetteExtractor.ts:23
const PRECISION_PAR_DEFAUT = 0.5 as const;
```

**Vérification au pas de 0,5**

Plancher : 38 / 32 / 19 / 4,5 / 4 / 0,5 / 0,5 = **98,5**. Manque 1,5 → 3
incréments, attribués aux 3 plus grands restes : 0,462 (SORWATHE), 0,397 (THYM),
0,231 (FIGUE).

→ **38,5 / 32 / 19,5 / 4,5 / 4 / 1 / 0,5** — identique à la base.

**Vérification au pas de 1**

Plancher : 38 / 32 / 19 / 4 / 4 / 0 / 0 = **97**. Manque 3 → 3 incréments, aux 3
plus grands restes : 0,897 (THYM), 0,641 (souci), 0,615 (arôme figue).

→ **38 / 32 / 19 / 5 / 4 / 1 / 1** — identique à la colonne « % pour liste
d'ingrédient » du classeur.

**Le moteur est juste. Seul le paramètre d'arrondi est inadapté à ce produit.**
Et la colonne du classeur qui contient la réponse attendue n'est jamais capturée.

### 1.4 Le `°` après `SORWATHE OP1`

La base porte `SORWATHE OP1`, **sans** `°`. Le caractère est ajouté à la
génération du texte de la liste :

```ts
// src/lib/recette/liste-ingredients.ts:36
const marqueurs = `${ing.estDemeter ? "✱" : ""}${ing.estEquitable ? "°" : ""}`;
```

`SORWATHE OP1` porte `est_equitable = true`. Le `°` est donc le **marqueur
commerce équitable**, pas une coquille.

Le texte de `fiches_etiquettes.ingredients_fr` est réécrit à la validation de la
recette (`src/app/actions/recette.ts:82-87` → `alignerListeIngredients`).

### 1.5 Sélection de l'onglet

**Aucune.** Tous les onglets sont concaténés :

```ts
// recetteExtractor.ts:39-49
for (const nom of workbook.SheetNames) {
    texte += `\nFeuille: ${nom}\n` + rows.map(r => r.join("\t")).join("\n");
}
```

puis tronqués : `texte.substring(0, 16000)` (ligne 71). Les 4 onglets (v0, v0 bis,
v.1, v.2) partent en un seul bloc, et **au-delà de 16 000 caractères la fin est
coupée sans avertissement**.

### 1.6 Choix entre deux tableaux dans un onglet

Aucune règle. Le prompt dit seulement :

> « Ignore les lignes de total, d'en-tête et les lignes vides. »
> « Une ligne = un ingrédient réel de la recette. »

Le choix entre « recette en cours » et « nouvelle recette » est laissé au modèle,
sans consigne. Il a choisi juste ici (les kg correspondent à V.2), **par chance,
pas par construction**.

### 1.7 Traçabilité de l'extraction

Ce qui existe :

```
usage_ia : IMPORT_RECETTE | mistral-large-latest | 3423 entrée / 388 sortie
           2026-09-07 06:49:06
```

Ce qui n'existe pas : **ni le prompt, ni la réponse brute du modèle ne sont
conservés.** `usage_ia` ne garde que les compteurs de jetons ; `audit_logs` ne
contient rien pour cet import.

Les valeurs 38.5 / 19.5 / 4.5 / 0.5 **ne peuvent pas** figurer dans la réponse du
modèle : le schéma Zod n'accepte que `designation`, `quantiteKg`, `pourcentage`,
`estDemeter`, `estEquitable`, et `pourcentage` n'est utilisé qu'en repli quand les
kilos manquent (`recetteExtraiteVersInput`, lignes 88-93). Les kilos étant
présents, le champ `pourcentage` renvoyé par le LLM a été purement ignoré.

**Le fichier source n'est pas conservé non plus.** `import.ts:46` lit
`file.arrayBuffer()` en mémoire ; seul le **nom** est stocké
(`fichierSourceNom`). Ni le `.docx` ni le `.xlsx` de ce produit ne sont présents
sur le serveur.

### 1.8 Comparatif de contrôle — MT265

Classeur `docs/MT2806 MATE SPORTIF.xlsx`, onglet unique, version V.0.

| Ingrédient | kg feuille | % feuille | % liste feuille | kg base | % étiquette base |
|---|---|---|---|---|---|
| MATE VERT | 10 | 62.189 | 62 | 10 | **62** ✓ |
| GINGEMBRE | 2.5 | 15.547 | 15.5 | 2.5 | **15.5** ✓ |
| GUARANA | 1 | 6.219 | 6 | 1 | **6** ✓ |
| HIBISCUS | 1 | 6.219 | 6 | 1 | **6** ✓ |
| HE ORANGE SANGUINE | 0.6 | 3.731 | 4 | 0.6 | **4** ✓ |
| MENTHE POIVREE | 0.6 | 3.731 | 4 | 0.6 | **4** ✓ |
| GINSENG | 0.3 | 1.866 | 2 | 0.3 | **2** ✓ |
| STEVIA | 0.08 | 0.498 | 0.5 | 0.08 | **0.5** ✓ |

**Correspondance parfaite, 8 sur 8.** Et pour cause : la feuille MT265 contient
`15,5` et `0,5`, son pas est donc bien 0,5. C'est sur ce produit que la constante
a été calée, puis généralisée à tout le catalogue.

**Anomalie distincte relevée au passage** : la recette MT265 contient **16 lignes
pour 8 ingrédients**. Chaque ingrédient apparaît deux fois — une série en
majuscules avec les vrais kilos, une série en minuscules dont les `quantite_kg`
sont des pourcentages renormalisés (`guarana 0.9677419`, `ginseng 0.32258064`).
Deux imports superposés dans la même recette, sans purge préalable. Sans rapport
avec TA7372, mais à traiter.

---

## 2. Champs vides ou faux dans la fiche

### 2.1 Mapping du seed initial

`src/db/seed-real-data.ts`. La fonction `findKey()` (ligne 17) fait un
**`includes()` insensible à la casse**, pas une égalité stricte — `'TYPE DE THÉ'`
capte donc bien la colonne `TYPE DE THÉ FR`.

**Vers `produits`** (lignes 68-90) :

| Colonne Excel recherchée | Colonne `produits` |
|---|---|
| `CODE PF` | code_pf |
| `GAMME` / `SOUS GAMME` | gamme / sous_gamme |
| `DÉNOMINATION FR` / `DENOMINATION EN` | denomination_fr / denomination_en |
| `SOUS-DÉS FR` / `SOUS-DÉS EN` | sous_designation_fr / _en |
| `TYPE DE THÉ` ou `TYPE DE PLANTE` | type_the_fr |
| `ORIGINE` / `PRODUCTEUR` / `Aromatisé` | origine / producteur_jardin / est_aromatise |
| `CONDITIONNEMENT` (défaut `'Vrac'`) | conditionnement |
| `CODE EAN` / `POIDS G OU KG` | code_ean / poids_net |
| `TPS MIN D'INFUSION` / `T° C INFUSION` | temps_infusion / temp_infusion |
| `TASSE DE 25 CL` / `NBRE DE TASSES` | poids_tasse / nb_tasses |
| `PLUSIEURS INFUSIONS` / `CERTIF ECOCERT` | plusieurs_infusions / mention_ecocert |

**Vers `fiches_etiquettes`** (lignes 91-110) : `CODE ETİQUETTE` *(noter le İ
turc)* ou `CODE ETIQUETTE` → code_etiquette ; `INGRÉDIENTS FR`, `ALLERGENES`,
`ALLÉGATIONS SANTÉ FR`, `PHRASE WFTO FR`, traductions DE / IT / NL.

`REF FACING 2025` et `RÉF CONTRE 2025` **ne sont mappées nulle part**.

### 2.2 Pourquoi ces champs sont vides

**Ni import partiel, ni écrasement : la suppression volontaire du produit avant le
test.**

La sauvegarde du 6 septembre (`backups/TA7372-avant-test-extraction-2026-09-06/produits.csv`)
conserve l'état issu du seed du **5 mars 2026** :

```
code_pf         = 'TA7372'                     poids_net      = '100'   ← BAT : 100g  ✓
gamme           = 'LES ENGAGÉS'                temp_infusion  = '90'    ← BAT : 90°C  ✓
sous_gamme      = 'AGIR POUR LA NATURE'        temps_infusion = '3'     ← BAT : 3min  ✓
type_the_fr     = 'Thé noir aromatisé'         nb_tasses      = '50'    ← BAT : 50    ✓
code_ean        = '3582810473726'              poids_tasse    = '2'     ← BAT : 2g    ✓
origine         = 'Ouganda - Afrique du Sud'   plusieurs_infusions = true
```

**Le seed était juste sur les cinq points vérifiables au BAT.** Ces valeurs ont
disparu à la suppression du produit, opérée volontairement pour le test. Le
produit actuel a été recréé à partir de la seule fiche dégustation.

Deux corollaires :

- La gamme d'origine était `LES ENGAGÉS` / `AGIR POUR LA NATURE`, et le BAT
  imprime bien « AGIR POUR LA NATURE ». Le `Les Militants` issu de l'extraction
  contredit à la fois le seed **et** l'étiquette.
- Certaines colonnes ne peuvent **jamais** être remplies par un import :
  `code_ean`, `poids_tasse`, `nb_tasses`, `sous_gamme`, traductions EN,
  `mention_ecocert`, `nomenclature_pmi` sont absentes de `produitValues`
  (`importWorker.ts:440-481`). Elles n'existent qu'au seed.

### 2.3 Risque d'écrasement — les deux chemins divergent

**Chemin CRÉATION — destructif :**

```ts
// importWorker.ts:494-503
.onConflictDoUpdate({ target: produits.codePf, set: produitValues })
```

`produitValues` contient **toutes** les colonnes mappées, chacune en
`ensureString(...) || null`. Sur un produit déjà seedé, tout champ que
l'extraction ne trouve pas **écrase la valeur existante par `null`** — et `gamme`
retombe sur la chaîne littérale `"Inconnue"`.

**Chemin RÉINTÉGRATION — non destructif :**

```
// importWorker.ts:673-676
Overwrite-non-null: only fields the new extraction actually found are written
— a missing field never clobbers an existing value
```

Réintégrer est sûr ; réimporter en création sur un code existant ne l'est pas.

### 2.4 La température 95 °C

Elle provient de :

```ts
// importWorker.ts:449
tempInfusion: ensureString(p.temperatureRecommandee || p.tempInfusion) || null
```

La fiche dégustation (v0, 2022) porte 95 °C comme **protocole de dégustation**, et
cette valeur atterrit dans le champ destiné à **l'étiquette**.

Corroboration en base : `fiches_degustation.temperature_degustation = '95°C'` et
`temps_degustation = '4mn'`, tandis que `produits.temps_infusion = '3 mn'`. Le
temps est donc correct, **seule la température a été croisée**. Le BAT indique
90 °C, le seed indiquait 90.

---

## 3. Extraction du texte des BAT

### 3.1 Bibliothèque

`pdf2json@4.0.2`, via `src/lib/utils/pdf-text.ts:20`, en mode
`new PDFParser(null, 1)` puis `parser.getRawTextContent()` (ligne 58).

Le fichier documente déjà une fragilité connue : `this.toUnicode.indexOf is not a
function` sur certains PDF, erreur qui s'échappe en rejet non capturé — d'où le
garde-fou par timeout ajouté.

### 3.2 Reproduction de la perte du « M »

Confirmée. Extraction des deux faces, 1 531 caractères au total. Sur
`ETCNA7372V5` :

```
                       alin comme un chimpanzé
```

Le **M** est absent, le reste de la ligne est intact : ce n'est pas une
troncature mais un glyphe non résolu. Cohérent avec la section *Known Issues* du
readme de pdf2json sur le support partiel des polices embarquées.

`pdftotext` et `pdfplumber` lisent ce même « M » correctement.

### 3.3 Taille et nom de fonte

**Disponibles partiellement.** Le format expose la métadonnée par *text run* :

```
readme.md:361
'TS': [fontFaceId, fontSize, 1/0 for bold, 1/0 for italic]
```

Deux limites :

1. **Notre code jette l'information.** `getRawTextContent()` ne renvoie que du
   texte brut. Il faudrait exploiter `pdfData.Pages[].Texts[].R[]` depuis
   l'événement `pdfParser_dataReady`.
2. **`fontFaceId` n'est pas le nom réel de la police.** C'est un index dans un
   dictionnaire de familles génériques (`kFontFaces`, readme:419), du type
   `"QuickType,Arial,Helvetica,sans-serif"`. `JardinsGaia-Script` ne sera **pas**
   restitué. La taille (`TS[1]`) est en revanche exploitable.

Pour un futur contrôle de hauteur de x, `pdfplumber` ou `pdftotext` — qui lisent
déjà correctement le glyphe manquant — fournissent le nom de police réel, ce que
pdf2json ne fera pas.

---

## 4. Verdicts du modèle de vision

### 4.1 Appel et parsing

```
src/agents/audit/visual-robot.ts
  36  const response = await callMistral({ model: VISION_MODEL, ... })
  51  const raw = response.choices[0].message.content
  53  const parsed = DetectionSchema.parse(JSON.parse(clean))
  56  for (const p of parsed.pictos) presences[p.cle] = p.presence
```

`askPresence()` sert les deux passes : `detectPictos()` (ligne 61) et
`contreExaminerPictos()` (ligne 80). L'agrégation et le verdict sont dans
`src/lib/audit/visual/pictos.ts` (`aggregateAll`, `reconcile`,
`checksFromPresences`).

**Ce qui se perd** : `askPresence` ne retourne que `{ presences, tokensUsed }` ; la
réponse brute est jetée ligne 57. `audit-visuel.ts` n'écrit ensuite que les
compteurs de jetons dans `audit_logs`. **Les verdicts par logo et par face
n'existent que dans le navigateur de l'utilisateur.**

### 4.2 Modification minimale pour les persister *(description, non implémentée)*

Purement additive, sans toucher au calcul :

1. **`visual-robot.ts`** — ajouter `reponseBrute: raw` et `pictos: parsed.pictos`
   au type `VisualRobotResult`. Aucune signature d'appelant ne change, ce sont des
   champs supplémentaires.
2. **`audit-visuel.ts`** — accumuler, par face et par passe, un objet
   `{ cleS3, passe: "DETECTION" | "CONTRE_EXAMEN", presences, reponseBrute }`.
3. **Stockage** — le moins invasif est d'étendre le champ `changements` de
   `writeAuditLog`, déjà en JSON, déjà appelé, déjà best-effort :

```ts
changements: { tokensUsed, parRobot, faces, dossiers,
               detections: [...], presencesFinales: {...}, checks: [...] }
```

Zéro migration, zéro table nouvelle, et l'historique devient interrogeable en SQL
immédiatement.

Une table dédiée (`resultats_audit_visuel`) serait plus propre pour des
statistiques de fiabilité par logo dans la durée, mais elle exige une migration et
n'apporte rien de plus à court terme.

### 4.3 Condition de déclenchement du contre-examen

```ts
// src/app/actions/audit-visuel.ts:118-120
const contested = checksFromPresences(agg1)
    .filter((c) => c.statut === "FAIL" || c.statut === "WARNING")
    .map((c) => c.id.replace("VIS_", ""));
```

Ligne 123 : `if (contested.length > 0)`.

Un contrôle `PASS` n'entre jamais dans `contested`. **Un logo obligatoire déclaré
présent à tort n'est donc jamais relu** — or c'est précisément le mode d'échec
observé en juin 2026 sur `mistral-medium`, qui avait halluciné un logo AB. Ce
modèle est celui qui tourne aujourd'hui, `pixtral-large` ayant été retiré du
catalogue Mistral.

---

## 5. Points non vérifiables sans action supplémentaire

1. **Preuve machine de l'arrondi.** La dérivation ci-dessus est faite à la main et
   concorde au chiffre près sur les deux produits. Confirmation possible par
   `npx vitest run src/tests/recette.test.ts` (test existant, fonction pure,
   aucun appel réseau).
2. **Contenu réel du classeur TA737.** Le fichier n'est pas conservé sur le
   serveur ; l'analyse repose sur la transcription fournie.
3. **Perte du « M » face par face.** L'extraction a été faite sur les deux faces
   en un bloc. Une extraction séparée avec dump du champ `TS` par mot indiquerait
   quelle taille de fonte porte le glyphe perdu.

---

## 6. Synthèse des causes racines

| # | Cause | Emplacement | Conséquence observée |
|---|---|---|---|
| 1 | Pas d'arrondi QUID figé à 0,5 | `recetteExtractor.ts:23` | 38.5 / 19.5 / 4.5 / 0.5 au lieu de 38 / 19 / 5 / 1 |
| 2 | Colonne « % pour liste d'ingrédient » jamais lue | `recetteExtractor.ts:52-72` | La réponse attendue existe dans le classeur mais est ignorée |
| 3 | Tous les onglets concaténés, sans sélection de version | `recetteExtractor.ts:39-49` | Le choix de version repose sur le modèle |
| 4 | Troncature silencieuse à 16 000 caractères | `recetteExtractor.ts:71` | Perte possible sans avertissement |
| 5 | Upsert destructif sur le chemin de création | `importWorker.ts:494-503` | Écrasement par `null` de données seedées |
| 6 | Température de dégustation écrite dans le champ étiquette | `importWorker.ts:449` | 95 °C au lieu de 90 °C |
| 7 | Colonnes absentes de `produitValues` | `importWorker.ts:440-481` | `code_ean`, `nb_tasses`, `poids_tasse`, `sous_gamme`… jamais remplies par import |
| 8 | Ni prompt ni réponse LLM conservés | `mistral-call.ts` / `usage_ia` | Aucune traçabilité d'extraction |
| 9 | Fichier source non conservé | `import.ts:46` | Impossible de rejouer ou de vérifier a posteriori |
| 10 | Verdicts de vision non persistés | `visual-robot.ts:57` | Impossible d'auditer la fiabilité du modèle |
| 11 | Contre-examen limité aux verdicts négatifs | `audit-visuel.ts:118-120` | Un faux « présent » n'est jamais rattrapé |
| 12 | Doublons d'ingrédients dans une même recette | à qualifier | MT265 : 16 lignes pour 8 ingrédients |

Aucune correction n'est proposée à ce stade.
