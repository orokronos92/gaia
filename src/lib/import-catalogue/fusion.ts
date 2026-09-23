/**
 * Merge of one existing record against the v2 workbook, which is the
 * reference (Ouro's decision of 2026-09-23): what the March seed wrote
 * (ancestor), what the app holds now (base), what the workbook says (excel).
 *
 * The workbook wins wherever it carries a value, app edits included — those
 * are flagged `ecraser` so the report and the audit log keep the value lost.
 * An empty cell erases only what the March seed wrote (its "Vrac" default);
 * a value typed in the app since is kept and listed.
 */
import type { Decision, DecisionChamp, Valeur } from "./types";

/** Comparison key: the same content written differently compares equal. */
export function cleComparaison(valeur: Valeur | undefined): string | null {
  if (valeur === null || valeur === undefined) return null;
  if (typeof valeur === "boolean") return String(valeur);
  if (Array.isArray(valeur)) return valeur.length === 0 ? null : [...valeur].sort().join("|");
  const texte = valeur.replace(/\r\n?/g, "\n").trim();
  return texte === "" ? null : texte;
}

export function deciderChamp(ancetre: Valeur | undefined, base: Valeur, excel: Valeur): Decision {
  const a = cleComparaison(ancetre);
  const b = cleComparaison(base);
  const e = cleComparaison(excel);
  if (b === e) return "identique";
  if (e === null) return ancetre !== undefined && b === a ? "prendre" : "vide_excel";
  if (b === null || (ancetre !== undefined && b === a)) return "prendre";
  return "ecraser";
}

export function fusionner<K extends string>(
  champs: readonly K[],
  ancetre: Partial<Record<K, Valeur>> | undefined,
  base: Record<K, Valeur>,
  excel: Record<K, Valeur>,
): DecisionChamp[] {
  return champs.map((champ) => {
    const valeurAncetre = ancetre === undefined ? undefined : (ancetre[champ] ?? null);
    return {
      champ,
      decision: deciderChamp(valeurAncetre, base[champ], excel[champ]),
      ancetre: valeurAncetre,
      base: base[champ],
      excel: excel[champ],
    };
  });
}

/** Decisions that write the workbook value. */
export const ecrit = (d: DecisionChamp): boolean => d.decision === "prendre" || d.decision === "ecraser";

/** The fields to write: the workbook value wherever the merge took it. */
export function valeursAPrendre(decisions: readonly DecisionChamp[]): Record<string, Valeur> {
  return Object.fromEntries(decisions.filter(ecrit).map((d) => [d.champ, d.excel]));
}
