import { cn } from "@/lib/utils";

/**
 * Shared visual vocabulary for a recette ingredient row (SPEC-03b).
 *
 * The editable <RecetteCalculator> rows render from THESE atoms, keeping a single
 * source of truth for the row's look (designation/code, % brut, % étiquette,
 * Demeter/fair-trade markers) — any future read-only view reuses the same atoms.
 */

/**
 * Row marker for Demeter / fair trade.
 *
 * The glyph is the label's own convention, not decoration: one star means
 * organic, TWO mean Demeter (PRO-QHS-013 §11.1). Both toggles used to render a
 * single star, so the screen taught Marie the opposite of the rule — a Demeter
 * ingredient showed the organic mark.
 *
 * Fair trade deliberately gets no star at all: §11.1 defines no per-ingredient
 * marker for it, and the artwork prints none. Giving it one would promise a
 * symbol that never reaches the label — a check simply records the fact.
 */
export function Pastille({ on, ton }: { on: boolean; ton: "emerald" | "indigo" }) {
  if (!on) return <span className="text-stone-300 dark:text-stone-600">—</span>;
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold leading-none",
        ton === "emerald"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
      )}
    >
      {ton === "emerald" ? "✱✱" : "✓"}
    </span>
  );
}

/** Article code sub-text under the designation. */
export function CodeArticleText({ code }: { code: string | null }) {
  if (!code) return null;
  return <span className="ml-2 text-[10px] text-stone-400">{code}</span>;
}

/** Raw % — computed, greyed, 2 decimals (matches the source fiche convention).
 *  "—" when not computable yet. */
export function PctBrutText({ value }: { value: number | null }) {
  return (
    <span className="tabular-nums text-xs text-stone-400">
      {value == null ? "—" : value.toFixed(2)}
    </span>
  );
}

/** Label % — the highlighted figure. "—" when not computed yet. */
export function PctEtiquetteText({ value }: { value: number | null }) {
  return (
    <>
      <span className="text-base font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
        {value == null ? "—" : value}
      </span>
      <span className="text-xs text-stone-400">%</span>
    </>
  );
}
