/**
 * Three-way merge of one existing record: what the March seed wrote (ancestor),
 * what the app holds now (base), what the v2 workbook says (excel).
 *
 * The ancestor tells who changed a field. Without it — products created in the
 * app — an empty base takes the workbook value and any other difference is a
 * conflict. The workbook never erases: an empty cell over an app value is kept
 * and listed.
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
  if (e === null) return "vide_excel";
  if (ancetre === undefined) return b === null ? "prendre" : "conflit";
  if (b === a) return "prendre";
  if (e === a) return "garder";
  return "conflit";
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

/** The fields to write: only what the merge decided to take from the workbook. */
export function valeursAPrendre(decisions: readonly DecisionChamp[]): Record<string, Valeur> {
  return Object.fromEntries(decisions.filter((d) => d.decision === "prendre").map((d) => [d.champ, d.excel]));
}
