---
name: audit-checklist
description: Canonical reference for the GaïaLabel label-audit system — the 35-point control checklist (PRO-QHS-013), the three-lane execution model (deterministic / llm / manual), and per-point data backing. Apply whenever working on the audit engine, auditWorker, controles_conformite, the "Audit IA" UI, or any compliance-control logic. Prevents wrong lane assignment, hallucinated control ids, and asking the LLM what code already computes.
---

# Audit Checklist — GaïaLabel

Source of truth for the label-compliance audit. The audit verifies a `fiche d'étiquette` against
**PRO-QHS-013** (Procédure de vérification d'étiquetage, v.1, 30/03/2023). This skill is the canonical
map of *what* is checked and *who* checks it (code vs LLM vs human). It does NOT contain implementation —
it constrains it.

## 0. The non-negotiable principle

Every control point carries a **`mode`**. The mode decides the executor, and the rule is hard:

- **`deterministic`** → evaluated by **pure code** (calculation, threshold, regex, string match). The LLM
  **never** judges these. QUID / rounding / ingredient order come from `computeRecette`
  (`src/lib/business-rules/recette.ts`, golden-tested against MT265) — never from a model.
- **`llm`** → evaluated by an LLM, but only for **textual rule interpretation** (denomination wording,
  health-claim completeness, label justification). Always with targeted RAG context.
- **`manual`** → a **visual control on the BAT** that Marie ticks herself. Not an agent. The system
  pre-fills `À VÉRIFIER` and persists her decision (identity + timestamp).

Asking the LLM to do a `deterministic` point is the #1 reliability bug to avoid — reproducibility and
client trust are the product.

## 1. Three-lane execution model (target architecture)

Replaces the legacy single Mistral prompt that bundled 5 controls.

1. **Passe 0 — Applicability** (`getApplicableControls(ctx)`, 0 token): points whose `applicableSi`
   predicate is false → status `NA`, dropped before any work. On MT265, ~10/35 go NA.
2. **Voie A — Deterministic** (pure code, 0 LLM, reproducible): the reliability socle.
3. **Voie B — LLM, grouped by domain** (parallel thematic agents + adversarial verify pass on critical
   points like ALLEGATION). Each agent gets 2–4 points + its own RAG query.
4. **Voie C — Manual**: pre-filled checklist Marie confirms on the BAT.
5. **Synthèse**: aggregate the three lanes → `overallStatus`. A manual `À VÉRIFIER` is **not** a FAIL.
   Persist per-control, grouped by `section`.

## 2. Status & type model

- **`ControlStatus`**: `PASS` | `WARNING` | `FAIL` | `NA`. (DB `StatutControle` also has `PENDING`,
  `SKIPPED` for engine/LLM failure — failure must stay honest, never fabricated.)
- **Control identity**: use the stable business `id` (`"1.0"`, `"3.2"`, …) from the code-side registry as
  source of truth. Do **not** rely on the legacy DB `TypeControle` enum (14 values) — it predates this
  checklist and mismatches both the old worker (5 values) and this 35-point set. Target: DB stores
  `controlPointId` + `mode` + `statut`, not a rigid enum.

## 3. The 35 control points

Legend — **Backing**: `engine` = computeRecette · `match` = string/regex on existing field ·
`field?` = needs a field that may be missing · `gap` = no backing data today · `visual` = BAT only.

| id | section | typeControle | mode | Backing | Note |
|----|---------|--------------|------|---------|------|
| 1.0 | DENOMINATION | DENOM_LEGALE | llm | text | Objective description (état/traitement). |
| 1.1 | DENOMINATION | DENOM_THE_51 | deterministic | field? | ≥51% Camellia sinensis → needs a Camellia flag on ingredients. Applic: contientThe. |
| 1.2 | DENOMINATION | DENOM_AROMATISE | llm | text | "aromatisé/goût/saveur" per §1.2. Applic: estAromatise. |
| 1.3 | DENOMINATION | DENOM_PARFUME | llm | text | "parfumé" only for enfleurage. Applic: estParfumeEnfleurage. |
| 1.4 | DENOMINATION | DENOM_CHAMP_VISUEL | manual | visual | Same visual field as net weight, upright legible. |
| 2.1 | INGREDIENTS | INGR_MENTION | deterministic | match | Word "ingrédients" precedes the list. |
| 2.2 | INGREDIENTS | INGR_ORDRE_DECROISSANT | deterministic | engine | Descending weight order via `ordreTri`. |
| 2.3 | INGREDIENTS | INGR_MONO | deterministic | engine | Mono-ingredient: list correctly omitted. |
| 2.4 | INGREDIENTS | INGR_ETOILES_BIO | manual | visual | * bio / ** demeter + certification mention, demeter bold italic. |
| 3.1 | QUID | QUID | deterministic | engine | % declared for highlighted/denomination ingredients. |
| 3.2 | QUID | ROUNDING | deterministic | engine | One decimal, 2nd-decimal 0-4↓ / 5-9↑. Largest-remainder, golden MT265. |
| 3.3 | QUID | QUID_AJUSTEMENT_100 | deterministic | engine | Overshoot adjusted on the most important ingredient. |
| 4.1 | NUTRITION | NUTRITION_EXEMPTION | llm | text | Exempt category (infusions/thés). |
| 4.2 | NUTRITION | NUTRITION_MENTION | llm | text | If aromatisation alters nutrition → "Informations nutritionnelles…". |
| 5.1 | PARTICULARITES | ALLERGEN | deterministic | match | Presence + highlight (highlight part is visual). Applic: allergenes set. |
| 5.2 | PARTICULARITES | ALLEGATION | llm | text | Claim → nutrition values + "mode de vie sain" + daily-cups mention. Applic: allegation set. **Critical → adversarial verify.** |
| 5.3 | PARTICULARITES | REGLISSE | deterministic | field? | JDG hypertension mention. Applic: contientReglisse → **needs a field (gap today)**. |
| 6.1 | QUANTITE_NETTE | QTE_NETTE_UNITE | deterministic | match | Net qty in mass unit (g/kg). poidsNet is varchar — parse. |
| 6.2 | QUANTITE_NETTE | QTE_NETTE_HAUTEUR | manual | visual | Digit height by weight band. |
| 7.1 | CONSERVATION | CONSERVATION_MODE_EMPLOI | llm | text | Brewing instructions present, not symbols-only. |
| 7.2 | CONSERVATION | CONSERVATION_MENTION | deterministic | match | JDG "À conserver à l'abri…" present. |
| 8.1 | ORIGINE | ORIGINE_SOUS_CODE_OC | manual | visual | Origin placed under OC code, under Eurofeuille. |
| 8.2 | ORIGINE | ORIGINE_AGRICULTURE_98 | llm | field? | "Agriculture UE/non UE" coherent with ≥98% origin → needs % origin. |
| 8.3 | ORIGINE | ORIGINE_VOLONTAIRE_50 | llm | field? | Voluntary origin only if >50%. Applic: origineMpUnique (gap). |
| 9.1 | FABRICANT | FABRICANT_ADRESSE | deterministic | match | Full JDG address, no packer code. |
| 10.1 | GENCODE | GENCODE_STRUCTURE | deterministic | field? | 35/8281/famille/article/cond/clé. codeEan exists; full gencode partial. |
| 11.1 | METROLOGIE | METRO_E_ABSENT | manual | visual | The "e" must be ABSENT (JDG policy). |
| 12.1 | PICTOGRAMMES | TRIMAN | manual | visual | Triman ≥1×1cm. |
| 12.2 | PICTOGRAMMES | INFOTRI | manual | visual | Info-Tri cartouche complete. |
| 13.1 | LABELS | EUROFEUILLE | manual | visual | Eurofeuille dimensions, same visual field as OC + origin. |
| 13.2 | LABELS | CODE_OC | deterministic | field? | FR-BIO-01 present → **needs an OC-code field (gap, only codeEan today)**. |
| 13.3 | LABELS | LABELS_NON_OFFICIELS | llm | json | WFTO/Fairtrade/Demeter… justified by raw material. labelsMP/labelsClient. |
| 13.4 | LABELS | POINT_VERT_ABSENT | manual | visual | Point Vert must be ABSENT (AGEC). |
| 14.1 | TYPOGRAPHIE | TYPO_HAUTEUR_X | manual | visual | x-height by largest face (<80cm² / >80cm²). |
| 15.1 | CODE_ETIQUETTE | CODE_ETIQUETTE | deterministic | match | Code étiquette present on back label. codeEtiquette field. |

## 4. AuditContext (applicability predicates)

`typeTheFr`, `contientThe`, `estAromatise`, `estParfumeEnfleurage`, `ingredients`, `allergenes`,
`allegationsSanteFr`, `contientReglisse`, `surfaceFacePrincipaleCm2`, `origineMpUnique`.
`getApplicableControls(ctx)` filters; `partitionByMode(controls)` splits into the three lanes.

## 5. Data gaps (no backing field today — decide field-by-field with Ouro)

`contientReglisse` (5.3) · OC code FR-BIO-01 (13.2) · Camellia-sinensis flag (1.1) · `surfaceFacePrincipaleCm2`
(typo/dematerialisation thresholds) · % per origin / `origineMpUnique` (8.2/8.3) · full gencode (10.1) ·
pictos & typo are inherently `visual` → stay `manual`.

The deterministic socle (Voie A) only needs the first three to be complete; the rest are manual or LLM.

## 6. What NOT to do

- ❌ Send all controls to one LLM prompt (legacy pattern being removed — fragile, dilutes attention,
  one bad JSON kills everything, RAG can't serve all domains).
- ❌ Let the LLM produce QUID / ROUNDING / order — use `computeRecette`.
- ❌ Treat a manual `À VÉRIFIER` as a FAIL when computing `overallStatus`.
- ❌ Reuse the legacy `TypeControle` DB enum as identity — use the stable `id`.
- ❌ Fabricate a verdict on engine/LLM failure — emit `SKIPPED`/`PENDING` honestly.
