---
name: etiquette-domain-glossary
description: Domain vocabulary for the GaïaLabel project (Les Jardins de Gaïa — organic tea and herbal-tea labelling). Apply whenever working with product codes (codePf, codeMp), label types, audit checks, workflow status, JDG roles, regulatory standards (INCO/Demeter/WFTO/Eurofeuille), or any business naming. Prevents misnaming, hallucinated synonyms, and wrong references in code, comments, and prompts.
---

# Etiquette Domain Glossary — GaïaLabel

When you work on this codebase, you are working in a **regulated food-labelling domain**. The vocabulary is precise and the legal stakes are real (mislabelling exposes JDG to recalls and fines). Use the exact terms below — do not invent synonyms.

## 1. Product codes & hierarchy

| Term | Meaning |
|---|---|
| **codePf** | Code Produit Fini. The product-finished SKU (e.g., `TB4041`, `MT165`). Format : 2-letter family + 3-4 digit code + 1-digit packaging. Defined in `MOP-PRO-029` §2. |
| **codeMp** | Code Matière Première. The raw-material SKU (e.g., `TV213`). The codePf typically derives from the codeMp + a packaging digit. |
| **codeArticle** | Generic term for any item code (Mp or Pf) in the ERP. Max 18 characters, no spaces, no special chars. |
| **EAN** | The barcode (13 digits) printed on the final package. Different from codePf. |

**Family codes** (first 2 letters of codePf) — partial list, see MOP-PRO-029 §2.1.1 for the full table:
`TV` Thé Vert, `TB` Thé Boîte (mostly metal tins), `TN` Thé Noir, `MT` Maté, `HB` Honeybush, `BR` Base Rooibos, `BV` Base Vert, `BN` Base Noir, `BB` Base Blanc, `BE` Base Épice, `AC` Arôme Composé, `AS` Arôme Simple, `EF` Épice & Fleur, `COF` Brique (coffret).

**Packaging digits** (last digit of codePf) — see MOP-PRO-029 §2.1.3:
`1` 1.5kg vrac · `2` 100g (or ≥80g) · `3` 1kg Malongo · `4` 250g · `5` 500g · `6` 50g (or <80g) · `7` 1kg JDG.

## 2. Document types in the workflow

| Term | Meaning |
|---|---|
| **Fiche article (PMI)** | The product master record in the PMI ERP. Source of truth for codes, weights, ingredients. Read-only from GaïaLabel's perspective — we import, we don't write back (yet). |
| **Fiche d'étiquette** | The labelling record in GaïaLabel (table `fichesEtiquettes`). Contains the regulatory texts (denomination, ingredients, allergens, claims, mentions). Owned by Marie. |
| **Fiche de dégustation** | Tasting/organoleptic notes for a product (table `fichesDegustation`). Visual, olfactory, gustatory, tactile descriptors. Used for marketing text suggestions, not regulatory. |
| **Fil rouge** | Marie's tracking Excel sheet (legacy). The app should make it obsolete. |
| **BAT** | Bon À Tirer — printer's proof. Sent by Fabrice to Marie for sign-off before the final print run. Stored as PDF in MinIO. |
| **ETBN/ETCBN/ETTUTO files** | Specific BAT naming conventions used by JDG : `ETBN` boîte normal, `ETCBN` boîte carton, `ETTUTO` étui (cardboard sleeve). The filename embeds the codePf. |
| **Bon de commande imprimeur** | Print order issued by JDG to the printer (Pascal/Achats). Outside our scope. |

## 3. Etiquette workflow status (Drizzle enum `StatutEtiquette`)

Linear-ish progression — see `src/db/schema.ts` for the enum :

`DRAFT` → `QUALITY_REVIEW` → `QUALITY_VALIDATED` → `DESIGN_IN_PROGRESS` → `DESIGN_REVIEW` → `DESIGN_VALIDATED` → `SENT_TO_PRINTER` → `BAT_RECEIVED` → `BAT_VALIDATED` → `PRINTING` → `RECEIVED` → `RECEPTION_CONTROLLED` → `ACTIVE` → `ARCHIVED`

Never invent intermediate statuses. If a state is missing, raise it to the user — adding a status to the enum is a schema change.

## 4. Compliance audit types (Drizzle enum `TypeControle`)

| Code | Meaning | Reference |
|---|---|---|
| `DENOMINATION` | Product name compliance (denomination légale) | INCO 1169/2011 art. 17 |
| `QUID` | Quantitative Ingredient Declaration — % of characterizing ingredients in the name must appear in the ingredient list | INCO 1169/2011 art. 22 |
| `ROUNDING` | Nutritional values rounding rules (per 100g/100ml) | INCO 1169/2011 Annexe XV |
| `ALLEGATION` | Health claims compliance (only authorized claims, no medical claims) | EU 1924/2006 |
| `ALLERGEN` | Mandatory allergen declaration, must be visually emphasized (bold) | INCO 1169/2011 art. 21 |
| `REGLISSE` | Specific warning if liquorice (réglisse) content above threshold | INCO 1169/2011 |
| `LABEL_COHERENCE` | Consistency of certification labels (Bio, Demeter, WFTO) with the actual product status | Demeter / WFTO specs |
| `VISUAL_COHERENCE` | BAT visual vs the data in the system (text, logos, color zones) | Internal |
| `EAN_CODE` | EAN13 validity (check digit, no collision in PMI) | GS1 |
| `INFO_TRI` | Triman + info-tri pictogram per French waste-sorting regulation | French Code de l'environnement |
| `CHAR_SIZE` | Minimum font size for mandatory mentions (1.2mm x-height) | INCO 1169/2011 art. 13 |
| `NUTRITIONAL` | Nutritional declaration completeness | INCO 1169/2011 |
| `PDF_VS_EXCEL` | Comparison between BAT PDF content and source Excel data | Internal |
| `BAT_VS_LABEL` | Comparison between BAT PDF and physical received label | Internal |

When prompting Mistral to perform a check, always cite the corresponding regulation in the system prompt — improves accuracy.

## 5. Certifications & labels

| Label | Scope | Document reference |
|---|---|---|
| **Eurofeuille** (Bio EU) | Mandatory for organic-claimed products sold in EU | Règlement UE 2018/848 — see `eur135050.pdf` in /docs/referentiels/ |
| **Demeter** | Biodynamic farming, stricter than organic | `Cahier-des-charges-Demeter-France-2025_01_01_2025.pdf` |
| **WFTO** | World Fair Trade Organization — fair trade across the whole supply chain | `2021_03_02_WFTO_LabelandMark_compressed.pdf` |
| **AB** | French organic (predecessor of Eurofeuille, still used) | Aligned with EU 2018/848 |

In code, the `labelsProduits` table associates a product with one or more of these.

## 6. Regulatory references (internal & external)

| Reference | Content | Where it lives |
|---|---|---|
| `PRO-QHS-013` | JDG's internal procedure for label verification — defines what Marie checks and how | `/docs/referentiels/PRO-QHS-013_PROCEDURE_VERIFICATION_DETIQUETAGE.docx` |
| `MOP-PRO-029` | JDG's operating mode for creating a fiche article in PMI | `/docs/referentiels/MOP-PRO-029.pdf` |
| `INCO` / `1169/2011` | EU regulation on consumer information for food | External |
| `1924/2006` | EU regulation on nutrition and health claims | External |
| `2018/848` | EU regulation on organic production | External |

Cite the reference (not "the regulation") when generating compliance prompts or error messages.

## 7. JDG roles & users

| Role (Drizzle enum) | Person | Scope |
|---|---|---|
| `QUALITE` | **Marie** | Primary user. Creates and validates fiches étiquettes, runs all compliance checks. Our UX north. |
| `GRAPHISME` | Fabrice | Designs the visual, uploads BAT |
| `ACHATS` | Pascal | Manages raw-material suppliers, MP codes |
| `CONDITIONNEMENT` | Céline | Receives finished products, runs reception controls |
| `DIRECTION` | Karrame | Final sign-off on sensitive validations |
| `MARKETING` | Chloé | Marketing texts, commercial wording |
| `ADMIN` | Victor (IT) / Ouro (consultant) | System administration |

When generating UI text, use neutral phrasing — don't hardcode names. When generating placeholders or sample data, Marie / Fabrice are fine (these are non-PII first names that JDG uses internally).

## 8. Vocabulary nuances to get right

- **Étiquette** vs **label** : in French regulatory context, "étiquette" = the physical printed label on the product. "Label" (used in JDG context) often refers to certifications (Bio, Demeter, WFTO). In code, our `Etiquette*` types are the printed label, and certifications are `LabelsProduits`.
- **Ingrédient caractérisant** : an ingredient highlighted in the product name. Triggers QUID. Example : "Tisane à la **camomille**" — camomille is characterizing and its % must appear in the ingredient list.
- **Mention obligatoire** : mandatory statement (allergens, durability date, fabricant, conservation). Has a min char-size requirement.
- **Dénomination légale** vs **dénomination commerciale** : legal name (per regulation) vs marketing name. Both can coexist; the legal name is mandatory.
- **DDM** (Date de Durabilité Minimale) — "À consommer de préférence avant le ..." — for shelf-stable products like tea. Not DLC (Date Limite de Consommation), which is for perishables.

## 9. Languages on a label

JDG products are sold across Europe. Each label carries the texts in 5 languages, with these column suffixes in the DB :
`Fr` (French — primary), `En`, `De`, `It`, `Nl`.

A "complete" fiche means all 5 languages filled where applicable. The audit subagents check coverage.

## 10. External systems

| System | Role | Interface |
|---|---|---|
| **PMI** | The ERP holding fiche article data | Manual export (Excel/CSV) → import in GaïaLabel (no live API yet) |
| **MinIO** | S3-compatible storage for PDFs (BAT), AI files (Illustrator), exports | Via AWS S3 SDK in `src/lib/utils/s3-client.ts` |
| **Mistral API** | LLM for audits, copilot, imports, RAG | Via `src/agents/MistralProvider.ts` |

## 11. What to do when a term is missing

If you encounter a term in user input, a referentiel doc, or existing code that is not in this glossary :
1. Don't guess a synonym.
2. Ask the main session (or the user) for clarification.
3. Propose to add the term to this glossary if it appears recurrently.

The glossary is a living document — extend it via PR, not silently in code.
