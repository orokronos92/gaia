# Architecture — GaïaLabel

> **Fichier généré par `npm run arch:build` — ne pas modifier à la main.**
> Toute modification manuelle est écrasée à la prochaine génération et fait échouer `npm run arch:check`.
> La prose (rôle des modules, intentions) vit dans `docs/INTENTION.md`.
> Base : commit `b463b19` · généré le 2026-09-23

**233 fichiers · 30956 lignes** (src/, scripts/, drizzle/ — hors tests et fichiers de déclaration)

## Dépendances entre dossiers

Une flèche A → B : au moins un fichier de A importe un fichier de B. L'étiquette compte les imports.

```mermaid
graph LR
  m0["scripts"]
  m1["scripts/architecture"]
  m2["src"]
  m3["src/agents"]
  m4["src/agents/audit"]
  m5["src/agents/imports"]
  m6["src/agents/knowledge"]
  m7["src/agents/recette"]
  m8["src/app"]
  m9["src/app/(dashboard)"]
  m10["src/app/actions"]
  m11["src/app/api"]
  m12["src/app/login"]
  m13["src/components"]
  m14["src/components/atoms"]
  m15["src/components/etiquettes"]
  m16["src/components/features"]
  m17["src/components/layout"]
  m18["src/components/produits"]
  m19["src/components/provenance"]
  m20["src/components/providers"]
  m21["src/components/recette"]
  m22["src/components/ui"]
  m23["src/db"]
  m24["src/db/queries"]
  m25["src/hooks"]
  m26["src/lib"]
  m27["src/lib/audit"]
  m28["src/lib/business-rules"]
  m29["src/lib/etiquettes"]
  m30["src/lib/recette"]
  m31["src/lib/referentiels"]
  m32["src/lib/utils"]
  m0 -->|2| m1
  m0 -->|1| m5
  m0 -->|4| m23
  m0 -->|2| m24
  m0 -->|3| m27
  m0 -->|2| m32
  m2 -->|2| m23
  m3 -->|1| m6
  m3 -->|1| m7
  m3 -->|1| m24
  m4 -->|6| m3
  m4 -->|1| m6
  m4 -->|2| m23
  m4 -->|2| m24
  m4 -->|3| m27
  m5 -->|4| m3
  m5 -->|1| m6
  m5 -->|2| m23
  m5 -->|3| m24
  m5 -->|1| m28
  m5 -->|1| m30
  m5 -->|1| m32
  m6 -->|1| m3
  m6 -->|2| m23
  m6 -->|1| m24
  m7 -->|1| m3
  m7 -->|1| m28
  m9 -->|4| m2
  m9 -->|4| m3
  m9 -->|3| m7
  m9 -->|18| m10
  m9 -->|1| m14
  m9 -->|3| m15
  m9 -->|5| m16
  m9 -->|2| m17
  m9 -->|4| m18
  m9 -->|2| m19
  m9 -->|2| m20
  m9 -->|3| m21
  m9 -->|42| m22
  m9 -->|11| m23
  m9 -->|27| m24
  m9 -->|18| m26
  m9 -->|18| m27
  m9 -->|2| m29
  m9 -->|2| m30
  m9 -->|1| m31
  m9 -->|1| m32
  m10 -->|14| m2
  m10 -->|1| m3
  m10 -->|3| m4
  m10 -->|2| m5
  m10 -->|2| m23
  m10 -->|37| m24
  m10 -->|3| m26
  m10 -->|22| m27
  m10 -->|1| m28
  m10 -->|7| m32
  m11 -->|9| m2
  m11 -->|1| m3
  m11 -->|1| m4
  m11 -->|1| m5
  m11 -->|1| m6
  m11 -->|8| m23
  m11 -->|4| m24
  m11 -->|3| m32
  m12 -->|4| m22
  m12 -->|1| m26
  m14 -->|1| m26
  m15 -->|2| m10
  m15 -->|5| m22
  m15 -->|5| m26
  m16 -->|8| m22
  m16 -->|3| m26
  m17 -->|1| m20
  m17 -->|3| m22
  m17 -->|1| m26
  m18 -->|2| m10
  m18 -->|2| m22
  m19 -->|3| m22
  m19 -->|5| m26
  m21 -->|2| m7
  m21 -->|2| m10
  m21 -->|1| m14
  m21 -->|1| m15
  m21 -->|3| m19
  m21 -->|12| m22
  m21 -->|3| m25
  m21 -->|10| m26
  m21 -->|4| m28
  m21 -->|7| m30
  m22 -->|14| m26
  m24 -->|1| m7
  m24 -->|28| m23
  m24 -->|1| m26
  m24 -->|5| m27
  m24 -->|1| m28
  m24 -->|2| m30
  m24 -->|1| m32
  m25 -->|1| m7
  m25 -->|1| m10
  m25 -->|1| m28
  m25 -->|5| m30
  m27 -->|1| m28
  m27 -->|11| m32
  m30 -->|1| m28
  m32 -->|1| m28
```

## Modules

| Module | Fichiers | Lignes | Dépend de | Utilisé par |
|---|---:|---:|---|---|
| `scripts` | 4 | 353 | `scripts/architecture`, `src/agents/imports`, `src/db`, `src/db/queries`, `src/lib/audit`, `src/lib/utils` | — |
| `scripts/architecture` | 4 | 403 | — | `scripts` |
| `src` | 3 | 96 | `src/db` | `src/app/(dashboard)`, `src/app/actions`, `src/app/api` |
| `src/agents` | 7 | 811 | `src/agents/knowledge`, `src/agents/recette`, `src/db/queries` | `src/agents/audit`, `src/agents/imports`, `src/agents/knowledge`, `src/agents/recette`, `src/app/(dashboard)`, `src/app/actions`, `src/app/api` |
| `src/agents/audit` | 3 | 427 | `src/agents`, `src/agents/knowledge`, `src/db`, `src/db/queries`, `src/lib/audit` | `src/app/actions`, `src/app/api` |
| `src/agents/imports` | 3 | 1101 | `src/agents`, `src/agents/knowledge`, `src/db`, `src/db/queries`, `src/lib/business-rules`, `src/lib/recette`, `src/lib/utils` | `scripts`, `src/app/actions`, `src/app/api` |
| `src/agents/knowledge` | 1 | 155 | `src/agents`, `src/db`, `src/db/queries` | `src/agents`, `src/agents/audit`, `src/agents/imports`, `src/app/api` |
| `src/agents/recette` | 1 | 113 | `src/agents`, `src/lib/business-rules` | `src/agents`, `src/app/(dashboard)`, `src/components/recette`, `src/db/queries`, `src/hooks` |
| `src/app` | 1 | 34 | — | — |
| `src/app/(dashboard)` | 52 | 7033 | `src`, `src/agents`, `src/agents/recette`, `src/app/actions`, `src/components/atoms`, `src/components/etiquettes`, `src/components/features`, `src/components/layout`, `src/components/produits`, `src/components/provenance`, `src/components/providers`, `src/components/recette`, `src/components/ui`, `src/db`, `src/db/queries`, `src/lib`, `src/lib/audit`, `src/lib/etiquettes`, `src/lib/recette`, `src/lib/referentiels`, `src/lib/utils` | — |
| `src/app/actions` | 15 | 1899 | `src`, `src/agents`, `src/agents/audit`, `src/agents/imports`, `src/db`, `src/db/queries`, `src/lib`, `src/lib/audit`, `src/lib/business-rules`, `src/lib/utils` | `src/app/(dashboard)`, `src/components/etiquettes`, `src/components/produits`, `src/components/recette`, `src/hooks` |
| `src/app/api` | 10 | 495 | `src`, `src/agents`, `src/agents/audit`, `src/agents/imports`, `src/agents/knowledge`, `src/db`, `src/db/queries`, `src/lib/utils` | — |
| `src/app/login` | 2 | 142 | `src/components/ui`, `src/lib` | — |
| `src/components` | 1 | 45 | — | — |
| `src/components/atoms` | 2 | 148 | `src/lib` | `src/app/(dashboard)`, `src/components/recette` |
| `src/components/etiquettes` | 5 | 789 | `src/app/actions`, `src/components/ui`, `src/lib` | `src/app/(dashboard)`, `src/components/recette` |
| `src/components/features` | 4 | 641 | `src/components/ui`, `src/lib` | `src/app/(dashboard)` |
| `src/components/layout` | 2 | 216 | `src/components/providers`, `src/components/ui`, `src/lib` | `src/app/(dashboard)` |
| `src/components/produits` | 3 | 440 | `src/app/actions`, `src/components/ui` | `src/app/(dashboard)` |
| `src/components/provenance` | 3 | 187 | `src/components/ui`, `src/lib` | `src/app/(dashboard)`, `src/components/recette` |
| `src/components/providers` | 1 | 137 | — | `src/app/(dashboard)`, `src/components/layout` |
| `src/components/recette` | 12 | 1593 | `src/agents/recette`, `src/app/actions`, `src/components/atoms`, `src/components/etiquettes`, `src/components/provenance`, `src/components/ui`, `src/hooks`, `src/lib`, `src/lib/business-rules`, `src/lib/recette` | `src/app/(dashboard)` |
| `src/components/ui` | 15 | 1269 | `src/lib` | `src/app/(dashboard)`, `src/app/login`, `src/components/etiquettes`, `src/components/features`, `src/components/layout`, `src/components/produits`, `src/components/provenance`, `src/components/recette` |
| `src/db` | 5 | 893 | — | `scripts`, `src`, `src/agents/audit`, `src/agents/imports`, `src/agents/knowledge`, `src/app/(dashboard)`, `src/app/actions`, `src/app/api`, `src/db/queries` |
| `src/db/queries` | 14 | 2460 | `src/agents/recette`, `src/db`, `src/lib`, `src/lib/audit`, `src/lib/business-rules`, `src/lib/recette`, `src/lib/utils` | `scripts`, `src/agents`, `src/agents/audit`, `src/agents/imports`, `src/agents/knowledge`, `src/app/(dashboard)`, `src/app/actions`, `src/app/api` |
| `src/hooks` | 2 | 511 | `src/agents/recette`, `src/app/actions`, `src/lib/business-rules`, `src/lib/recette` | `src/components/recette` |
| `src/lib` | 3 | 64 | — | `src/app/(dashboard)`, `src/app/actions`, `src/app/login`, `src/components/atoms`, `src/components/etiquettes`, `src/components/features`, `src/components/layout`, `src/components/provenance`, `src/components/recette`, `src/components/ui`, `src/db/queries` |
| `src/lib/audit` | 29 | 5333 | `src/lib/business-rules`, `src/lib/utils` | `scripts`, `src/agents/audit`, `src/app/(dashboard)`, `src/app/actions`, `src/db/queries` |
| `src/lib/business-rules` | 6 | 535 | — | `src/agents/imports`, `src/agents/recette`, `src/app/actions`, `src/components/recette`, `src/db/queries`, `src/hooks`, `src/lib/audit`, `src/lib/recette`, `src/lib/utils` |
| `src/lib/etiquettes` | 1 | 36 | — | `src/app/(dashboard)` |
| `src/lib/recette` | 9 | 1237 | `src/lib/business-rules` | `src/agents/imports`, `src/app/(dashboard)`, `src/components/recette`, `src/db/queries`, `src/hooks` |
| `src/lib/referentiels` | 1 | 57 | — | `src/app/(dashboard)` |
| `src/lib/utils` | 9 | 1303 | `src/lib/business-rules` | `scripts`, `src/agents/imports`, `src/app/(dashboard)`, `src/app/actions`, `src/app/api`, `src/db/queries`, `src/lib/audit` |

## Fichiers au-delà du seuil

Fichiers de plus de 300 lignes. « Importé par » = nombre de fichiers qui l'importent.

| Fichier | Lignes | Importé par |
|---|---:|---:|
| `src/app/(dashboard)/etiquettes/[id]/EtiquetteClient.tsx` | 1447 | 1 |
| `src/agents/imports/importWorker.ts` | 802 | 2 |
| `src/db/queries/fiches.ts` | 707 | 9 |
| `src/db/schema.ts` | 651 | 34 |
| `src/lib/audit/visual/text-robot.ts` | 571 | 18 |
| `src/hooks/useCalculatrice.ts` | 394 | 2 |
| `src/db/queries/recettes.ts` | 382 | 6 |
| `src/lib/audit/types.ts` | 350 | 28 |
| `src/lib/audit/visual/typographie.ts` | 346 | 1 |
| `src/lib/audit/control-checklist.ts` | 337 | 5 |
| `src/lib/audit/visual/mentions-etiquette.ts` | 320 | 1 |
| `src/lib/audit/visual/positions.ts` | 320 | 1 |
| `src/app/(dashboard)/etiquettes/[id]/_components/bat-visionneuse.tsx` | 319 | 1 |
| `src/db/queries/produits.ts` | 302 | 13 |
| `src/components/recette/RecetteCalculatorRow.tsx` | 301 | 1 |
| `src/lib/audit/visual/propositions.ts` | 301 | 2 |

## Dépendances circulaires

Chaque groupe est un ensemble de fichiers qui s'importent mutuellement, directement ou non.

1. `src/lib/audit/visual/propositions.ts`, `src/lib/audit/visual/text-robot.ts`

## Points d'entrée

### Routes Next.js

| URL | Type | Fichier |
|---|---|---|
| `/archives` | page | `src/app/(dashboard)/archives/page.tsx` |
| `/commandes` | page | `src/app/(dashboard)/commandes/page.tsx` |
| `/connaissances` | page | `src/app/(dashboard)/connaissances/page.tsx` |
| `/controle-graphisme` | page | `src/app/(dashboard)/controle-graphisme/page.tsx` |
| `/etiquettes/[id]` | page | `src/app/(dashboard)/etiquettes/[id]/page.tsx` |
| `/etiquettes/nouveau` | page | `src/app/(dashboard)/etiquettes/nouveau/page.tsx` |
| `/etiquettes` | page | `src/app/(dashboard)/etiquettes/page.tsx` |
| `/` | layout | `src/app/(dashboard)/layout.tsx` |
| `/notifications` | page | `src/app/(dashboard)/notifications/page.tsx` |
| `/` | page | `src/app/(dashboard)/page.tsx` |
| `/parametres/consommation` | page | `src/app/(dashboard)/parametres/consommation/page.tsx` |
| `/parametres` | layout | `src/app/(dashboard)/parametres/layout.tsx` |
| `/parametres/matieres` | page | `src/app/(dashboard)/parametres/matieres/page.tsx` |
| `/parametres` | page | `src/app/(dashboard)/parametres/page.tsx` |
| `/produits` | page | `src/app/(dashboard)/produits/page.tsx` |
| `/provenance-demo` | page | `src/app/(dashboard)/provenance-demo/page.tsx` |
| `/referentiels/gammes` | page | `src/app/(dashboard)/referentiels/gammes/page.tsx` |
| `/referentiels` | layout | `src/app/(dashboard)/referentiels/layout.tsx` |
| `/referentiels/matieres` | page | `src/app/(dashboard)/referentiels/matieres/page.tsx` |
| `/referentiels` | page | `src/app/(dashboard)/referentiels/page.tsx` |
| `/api/agents/audit` | route | `src/app/api/agents/audit/route.ts` |
| `/api/agents/chat` | route | `src/app/api/agents/chat/route.ts` |
| `/api/agents/import` | route | `src/app/api/agents/import/route.ts` |
| `/api/auth/[...nextauth]` | route | `src/app/api/auth/[...nextauth]/route.ts` |
| `/api/bat/rendu` | route | `src/app/api/bat/rendu/route.ts` |
| `/api/knowledge/upload` | route | `src/app/api/knowledge/upload/route.ts` |
| `/api/notifications/read-all` | route | `src/app/api/notifications/read-all/route.ts` |
| `/api/notifications/read` | route | `src/app/api/notifications/read/route.ts` |
| `/api/notifications` | route | `src/app/api/notifications/route.ts` |
| `/api/notifications/stream` | route | `src/app/api/notifications/stream/route.ts` |
| `/` | layout | `src/app/layout.tsx` |
| `/login` | page | `src/app/login/page.tsx` |

### Server Actions (fichiers `"use server"`)

- `src/app/actions/archivage.ts`
- `src/app/actions/audit-visuel.ts`
- `src/app/actions/audit.ts`
- `src/app/actions/catalogue.ts`
- `src/app/actions/controle-graphisme.ts`
- `src/app/actions/etiquettes.ts`
- `src/app/actions/fiche-champs.ts`
- `src/app/actions/gammes.ts`
- `src/app/actions/import.ts`
- `src/app/actions/knowledge.ts`
- `src/app/actions/matieres.ts`
- `src/app/actions/proposition-fiche.ts`
- `src/app/actions/recette.ts`
- `src/app/actions/validation-controle.ts`
