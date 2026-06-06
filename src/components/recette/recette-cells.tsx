import { cn } from "@/lib/utils";

/**
 * Shared visual vocabulary for a recette ingredient row (SPEC-03b).
 *
 * The editable <RecetteCalculator> rows render from THESE atoms, keeping a single
 * source of truth for the row's look (designation/code, % brut, % étiquette,
 * Demeter/fair-trade markers) — any future read-only view reuses the same atoms.
 */

/** Demeter / fair-trade marker. */
export function Pastille({ on, ton }: { on: boolean; ton: "emerald" | "indigo" }) {
  if (!on) return <span className="text-stone-300 dark:text-stone-600">—</span>;
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full text-xs font-bold",
        ton === "emerald"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
      )}
    >
      ✱
    </span>
  );
}

/** Article code sub-text under the designation. */
export function CodeArticleText({ code }: { code: string | null }) {
  if (!code) return null;
  return <span className="ml-2 text-[10px] text-stone-400">{code}</span>;
}

/** Raw % — computed, greyed, 3 decimals. "—" when not computable yet. */
export function PctBrutText({ value }: { value: number | null }) {
  return (
    <span className="tabular-nums text-xs text-stone-400">
      {value == null ? "—" : value.toFixed(3)}
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
