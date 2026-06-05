# GaïaLabel — Claude Code Instructions

> This file gives Claude Code the working agreement for this repository. Read it fully at the start of every session. It is the source of truth — override it only after explicit user confirmation, not based on patterns observed in older code.

> **Communication language** — **Always respond to the user in French.** The codebase, code comments, commit messages, and this document itself stay in English; only conversational replies to the user are in French. The user is Ouro (developer at SPC) — adopt a direct, concise, technically precise tone.

---

## 1. Project context

**Product** — GaïaLabel, application web de gestion centralisée des étiquettes pour produits alimentaires (thés et infusions bio).

**Client final** — Les Jardins de Gaïa (JDG), PME française basée en Alsace, certifiée bio et commerce équitable (Demeter, WFTO, Eurofeuille).

**Maître d'œuvre technique** — SPC.

**Utilisateurs principaux** :

- **Marie** (Qualité) — utilisatrice clé. Crée et valide les fiches étiquettes, vérifie la conformité réglementaire. Son interface est notre nord. **Réduire sa charge cognitive est la mission produit.**
- Fabrice (Graphisme), Pascal (Achats), Céline (Conditionnement), Karrame (Direction), Chloé (Marketing).

**Référentiels réglementaires à respecter** :

- `PRO-QHS-013` — Procédure interne JDG de vérification d'étiquetage
- `MOP-PRO-029` — Mode opératoire création fiche article (PMI/ERP)
- Cahier des charges Demeter France 2025
- Manuel d'utilisation Eurofeuille (Règlement UE 1169/2011 — INCO)
- WFTO Label and Mark Guidelines

L'app remplace un workflow fragmenté (Word, Excel, PMI, Illustrator, email). Ne pas répliquer la fragmentation en numérique : la remplacer par des dropdowns guidés, validation automatique, et pré-remplissage IA.

---

## 2. Tech stack & versions

| Layer | Tool | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server Components by default |
| Language | TypeScript strict mode | `noImplicitAny`, `strictNullChecks` |
| ORM | Drizzle ORM | Schema in `src/db/schema.ts`, migrations in `/drizzle` |
| Database | PostgreSQL 16 + pgvector | Runs on VPS host, app reaches it via `host.docker.internal:5432` |
| Storage | MinIO (S3-compatible) via AWS S3 SDK v3 | `forcePathStyle: true`, bucket `label-assets` |
| Auth | NextAuth v5 | `AUTH_TRUST_HOST=true` mandatory behind Traefik |
| AI provider | **Mistral only** | Anthropic SDK is legacy — do NOT extend it |
| Validation | Zod | Mandatory on all server boundaries |
| UI components | shadcn/ui (new-york style) | Do not recreate components that exist in `src/components/ui/` |
| Icons | lucide-react | |
| Styles | Tailwind CSS | Design tokens via CSS vars, no inline styles |
| Fonts | DM Serif Display (display) / DM Sans (body) / JetBrains Mono (code) | |

**Package manager** — `npm` (lockfile `package-lock.json`).

---

## 3. Architecture & folder structure

```
src/
├── app/                     # Next.js App Router — pages, layouts, route handlers
│   ├── (dashboard)/         # Authenticated routes (layout has force-dynamic)
│   ├── (auth)/              # Login page
│   └── api/                 # API routes (avoid; prefer Server Actions)
├── components/
│   ├── ui/                  # shadcn/ui primitives — DO NOT MODIFY
│   ├── layout/              # Sidebar, header, etc.
│   └── <feature>/           # Feature-specific composed components
├── db/
│   ├── schema.ts            # Drizzle schema — single source of truth
│   ├── index.ts             # Db client
│   ├── queries/             # Reusable query functions (one file per entity)
│   └── migrate.ts           # Migration runner
├── agents/                  # AI agents — Mistral-based
│   ├── BaseAgent.ts         # ReAct pattern base class
│   ├── audit/               # Compliance audit workers (QUID, ALLEGATION, ALLERGEN, etc.)
│   ├── imports/             # Document extraction (DOCX, XLSX, PDF)
│   └── knowledge/           # RAG service with pgvector
├── lib/
│   ├── utils.ts             # cn(), formatters
│   ├── utils/s3-client.ts   # MinIO client
│   ├── schemas/             # Zod schemas (one file per domain)
│   └── actions/             # Shared Server Actions
├── auth.ts                  # NextAuth config
└── middleware.ts            # Route protection
```

**Strict boundaries — do not cross :**

- `src/db/queries/*` is the ONLY allowed place to write Drizzle queries. Components and Server Actions import from there.
- `src/agents/**` MUST NOT import from `src/db/` directly. Use the query functions in `src/db/queries/`. This decouples AI logic from DB shape.
- `src/lib/` is for pure functions only. No DB, no fetch, no state.
- `src/components/` never imports from `src/agents/`. Components receive data as props.

---

## 4. Code quality rules — non-negotiable

- **TypeScript strict, no `any`.** If you must use `unknown`, narrow with Zod or a type guard before using.
- **Files under 300 lines.** TSX components over 300 lines must be refactored into composed sub-components (extract to a `_components/` folder adjacent to the page).
- **One default export per file.** Named exports for everything else.
- **Server Components by default.** Add `"use client"` ONLY when you need state, effects, browser APIs, or event handlers.
- **No `console.log` in committed code.** Remove before commit.
- **No magic numbers/strings.** Extract to `const` with explicit type. Status enums live in Drizzle schema (`StatutEtiquette`, `TypeControle`, etc.), not duplicated in components.
- **UI text in French, code/comments/commits in English.**

---

## 5. Component guidelines

- **Server Component first** — fetch data in the component, pass it down as props to client components.
- **Server Actions for mutations** — co-located in the route folder when used by one page, in `src/lib/actions/` if shared.
- **One responsibility per component.** If a component fetches data AND renders three unrelated UI sections, split it.
- **shadcn/ui first.** Need a button, dialog, dropdown, form? Use `src/components/ui/`. Never recreate.
- **Forms** — `react-hook-form` + Zod resolver. Server Action receives the validated payload.
- **Naming :**
  - Files in `components/` : `kebab-case.tsx` (e.g., `label-detail-card.tsx`)
  - Exports : `PascalCase` (`LabelDetailCard`)
  - Props interface : `<ComponentName>Props`

---

## 6. Database patterns

- **Schema is the source of truth.** All shapes derive from `src/db/schema.ts` via `InferSelectModel` / `InferInsertModel`.
- **No Drizzle queries in components or Server Actions.** Write a function in `src/db/queries/<entity>.ts`, then import :

```ts
// src/db/queries/produits.ts
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { produits } from "@/db/schema";

export const getProduitByCodePf = cache(async (codePf: string) => {
  return db.query.produits.findFirst({
    where: eq(produits.codePf, codePf),
  });
});
```

- **Mutations touching more than one table** must run inside a transaction (`db.transaction(...)`).
- **Migrations through Drizzle**. No raw `psql` migrations except for emergency hotfixes (and even then, regenerate the matching drizzle snapshot to keep parity).

---

## 7. AI agents patterns

- **Mistral only.** Do not import `@anthropic-ai/sdk` in new code. The existing `AnthropicProvider.ts` is legacy — do not extend it.
- **All agents inherit from `BaseAgent`** which implements the ReAct loop (Thought → Action → Observation).
- **AI outputs are validated with Zod before use.** A hallucinated JSON response must NEVER reach the database without parsing :

```ts
const AuditResponseSchema = z.object({
  status: z.enum(["PASS", "FAIL", "WARNING"]),
  issues: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  })),
  summary: z.string(),
});

const raw = await mistralProvider.generate(prompt);
const parsed = JSON.parse(raw.text);
const audit = AuditResponseSchema.parse(parsed);  // ← safety net
```

- **RAG goes through `RAGService`.** Embeddings are stored in `pgvector`. Do not write raw vector queries elsewhere.
- **Token usage is logged** in `audit_logs` (audit trail expected by the client).
- **The current placeholder embedding** (charCode-based) is a known issue to be replaced with a real model — flag this when touching `RAGService`.

---

## 8. Security & validation

- **Every Server Action and API Route** starts with `Schema.parse(input)`. Zod first, logic second.
- **Auth check is the first line** of any protected Server Action :

```ts
"use server";
const session = await auth();
if (!session?.user) throw new Error("Unauthorized");
```

- **Never trust client-sent IDs.** Verify the user has access (e.g., the fiche belongs to their org/role).
- **No secrets in code**, ever. `.env*` is git-ignored. Reference via `process.env.X`.
- **SQL safety** — Drizzle parameterizes by default. If you use the `sql` template tag, parameterize with `sql\`${value}\`` — never interpolate strings into raw SQL.
- **MinIO file URLs** — switch from `getPublicUrl` to `getPresignedUrl` for any new file access (current `getPublicUrl` use is acceptable for demos but flagged for migration).

---

## 9. Git workflow

- **`gaia_ccode` is the current working branch.** All commits land here. `main` is reserved for milestones and is **never** pushed to without explicit user authorization.
- **Feature branches** (optional, if a chunk of work is large enough to warrant isolation) : `feat/<scope>`, `fix/<scope>`, `chore/<scope>`, `docs/<scope>` — branched off `gaia_ccode`, merged back into `gaia_ccode`.
- **Conventional commits, English, imperative mood :**
  - `feat(etiquettes): add edit mode on dossier produit tab`
  - `fix(auth): handle empty session in middleware`
  - `chore: remove legacy antigravity files`
  - `docs: clarify Mistral migration plan`
- **No `git push --force` on `main`**, ever.
- **One logical change per commit.** Don't bundle unrelated fixes.
- **Commit body explains WHY**, not just what — when the change is non-obvious.
- **Always confirm with the user before pushing.** Local commits are fine without confirmation.

---

## 10. Deployment notes

- **Production VPS** : Hostinger, Ubuntu 24.04, hostname `srv1301090.hstgr.cloud`.
- **App URL** : `https://gaialabel.srv1301090.hstgr.cloud` (Traefik routes by Host label).
- **Postgres** : runs on the VPS host, NOT in Docker. From the app container, reach it via `host.docker.internal:5432` (configured in `docker-compose.yml` with `extra_hosts`).
- **Build constraint** : Dashboard routes touch the DB during render. The `(dashboard)/layout.tsx` has `export const dynamic = "force-dynamic"` — do NOT remove without a tested alternative (e.g., switching every page to dynamic individually).
- **MinIO** : bucket `label-assets`, currently `public-read` policy (for early demos). Migration to presigned URLs planned.
- **Dockerfile** : currently installs TypeScript at runtime — known anti-pattern, scheduled fix.
- **Deploy cycle on VPS** :
  ```
  cd /docker/gaialabel/app && git pull
  cd /docker/gaialabel && docker compose build app && docker compose up -d app
  ```

---

## 11. What NEVER to do

- ❌ Add a top-level `db.select()` call in a Server Component without ensuring the route is dynamic (otherwise build fails on static generation).
- ❌ Skip Zod validation "because it's a quick test".
- ❌ Extend `AnthropicProvider.ts` or import `@anthropic-ai/sdk` in new code.
- ❌ Modify files in `src/components/ui/` (shadcn primitives — vendor-controlled).
- ❌ Push to `main` directly. **Always push to `gaia_ccode`** unless the user explicitly says "release to main".
- ❌ Run `src/db/seed-real-data.ts` or `src/db/seed.ts` on the production database (they do `TRUNCATE` / `DELETE`).
- ❌ Hardcode user emails / passwords / IDs in code (the mock user in `src/auth.ts` is being removed).
- ❌ Use `useEffect` to fetch data from the DB — use Server Components instead.
- ❌ Mix concerns in a single file ("UI + business logic + DB query" all in `etiquettes/[id]/page.tsx` is the current bad pattern to refactor, not to replicate).
- ❌ Run `npm install` without committing the resulting `package-lock.json` change.
- ❌ Add a new dependency without telling the user what it is, its license, and its bundle size impact.

---

End of CLAUDE.md. When uncertain about a pattern not covered here, **ask before writing**. Don't invent silent conventions — the user (Ouro) prefers explicit specs and small modular contributions over large autonomous rewrites.
