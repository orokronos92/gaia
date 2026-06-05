---
name: server-action-pattern
description: Canonical pattern for writing a Next.js Server Action in the GaïaLabel project. Apply whenever creating or modifying a Server Action that handles user input — covers Zod validation, auth check, error handling, query delegation, and structured response shape.
---

# Server Action Pattern — GaïaLabel

This skill defines the canonical shape of a Server Action in this codebase. Every Server Action must follow this pattern. The `code-reviewer` subagent will flag any deviation.

## When to apply this skill

Apply this pattern whenever you write or modify code in one of these locations:
- `src/lib/actions/<scope>.ts` (shared Server Actions)
- A `actions.ts` file co-located in a route segment (e.g., `src/app/(dashboard)/etiquettes/[id]/actions.ts`)
- Any file containing `"use server"` at the top

Do **not** apply this skill to API Routes (`src/app/api/...`) — they follow a similar but slightly different pattern (covered elsewhere).

## The five mandatory blocks

A compliant Server Action has these blocks **in this exact order** :

```ts
"use server";

// 1. Imports
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateFicheEtiquette, getFicheEtiquetteById } from "@/db/queries/fichesEtiquettes";
import type { ActionResult } from "@/lib/types/action-result";

// 2. Input schema (Zod, at the top of the file, exported for client-side reuse)
export const UpdateFicheInputSchema = z.object({
  ficheId: z.string().uuid(),
  texteCommercialFr: z.string().max(2000).optional(),
  ingredientsFr: z.string().max(4000).optional(),
  allergenes: z.array(z.string()).optional(),
});

export type UpdateFicheInput = z.infer<typeof UpdateFicheInputSchema>;

// 3. The Server Action itself
export async function updateFicheAction(
  rawInput: unknown
): Promise<ActionResult<{ ficheId: string }>> {
  // 3a. Validate input — first line, no exceptions
  const parsed = UpdateFicheInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Données invalides", issues: parsed.error.issues };
  }
  const input = parsed.data;

  // 3b. Auth check — second line, before any business logic
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Non authentifié" };
  }

  // 3c. Authorization — verify the user can act on this resource
  const fiche = await getFicheEtiquetteById(input.ficheId);
  if (!fiche) {
    return { success: false, error: "Fiche introuvable" };
  }
  // (add role/org checks here if applicable to the resource)

  // 3d. Business logic — delegated to query functions
  try {
    await updateFicheEtiquette(input.ficheId, {
      texteCommercialFr: input.texteCommercialFr,
      ingredientsFr: input.ingredientsFr,
      allergenes: input.allergenes,
      misAJourLe: new Date(),
    });
  } catch (err) {
    // log but don't leak internals
    console.error("[updateFicheAction] update failed", err);
    return { success: false, error: "Erreur technique lors de la sauvegarde" };
  }

  // 3e. Revalidate the cached paths that depend on this resource
  revalidatePath(`/etiquettes/${input.ficheId}`);
  revalidatePath("/etiquettes");

  // 3f. Return a structured success
  return { success: true, data: { ficheId: input.ficheId } };
}
```

## The `ActionResult` discriminated union

Every Server Action returns the same shape. Define it once in `src/lib/types/action-result.ts` :

```ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; issues?: unknown };
```

This makes client code consistent :

```tsx
const result = await updateFicheAction(formData);
if (!result.success) {
  toast.error(result.error);
  return;
}
toast.success("Fiche enregistrée");
router.refresh();
```

## Block-by-block rationale

### Block 1 — Imports
- Import `auth` from `@/auth`.
- Import query functions from `@/db/queries/<entity>` — never `@/db` directly.
- `revalidatePath` from `next/cache` when the action mutates data displayed elsewhere.
- Never import Drizzle (`@/db/schema`) in a Server Action — that's a smell, it means a query is being written inline.

### Block 2 — Zod schema (exported)
- Export the schema so the client form (`react-hook-form` + `zodResolver`) can reuse it. One source of truth for validation.
- Constrain string lengths (`.max(...)`) to prevent abuse.
- Use `.uuid()`, `.email()`, `.url()`, `.regex(...)` to be precise.
- For enums, mirror Drizzle enums : `z.enum(["DRAFT", "QUALITY_REVIEW", ...])` — keep values in sync with `src/db/schema.ts`.

### Block 3a — Validation
- Prefer `safeParse` over `parse` here. You want to return a clean error to the client, not throw.
- If validation fails, return `{ success: false, error: "...", issues: parsed.error.issues }` — the client can show field-specific errors.

### Block 3b — Auth check
- Always before business logic.
- `auth()` returns the NextAuth session.
- For most actions, just verifying that a session exists is enough. For admin actions, also check `session.user.role`.

### Block 3c — Authorization
- After confirming the user is logged in, confirm they have access to the specific resource.
- Don't blindly trust IDs sent from the client — verify the resource exists and the user can act on it.

### Block 3d — Business logic
- Always wrapped in `try/catch`.
- Log the internal error (`console.error` for now until a real logger is added).
- Return a user-friendly error message — never leak stack traces, SQL errors, or internal paths.
- All DB mutations go through `src/db/queries/`. Multi-table mutations use `db.transaction(...)` inside the query function.

### Block 3e — Cache revalidation
- After a successful mutation, revalidate the paths that show the modified data.
- `revalidatePath` is preferred over `revalidateTag` for simple cases. Use tags when the same data appears on many unrelated paths.

### Block 3f — Structured return
- Always return the same `ActionResult<T>` shape.
- Include enough data in `data` for the client to update its state without a follow-up request when possible (e.g., the new `id` after a create).

## File size

Server Actions tend to grow. If a single file exceeds 300 lines (CLAUDE.md §4 limit), **split by feature** — for instance:
- `actions/create-fiche.ts`
- `actions/update-fiche.ts`
- `actions/submit-fiche.ts`

Each file: one Zod schema + one action.

## Anti-patterns this skill prevents

- ❌ `db.update(fichesEtiquettes)...` inline in a Server Action → use `updateFicheEtiquette(...)` from queries
- ❌ Skipping Zod "for now, it's just a test" → never. The skill makes the cost trivial.
- ❌ Returning `{ ok: true }` or throwing instead of using `ActionResult` → inconsistent across the app
- ❌ Catching errors then `throw` again — defeats the structured return
- ❌ Letting `parsed.error.issues` reach the client when it contains sensitive data — filter if needed

## One-liner test

After writing a Server Action, ask : "If I delete any of blocks 3a–3f, would the action silently misbehave or leak data ?" If yes for any, the skill was correctly applied.
