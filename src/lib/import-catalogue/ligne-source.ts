/**
 * A workbook row kept verbatim (table `lignes_source`, migration 0028), and the
 * control it makes possible on the PMI text pieces.
 */
import { texte } from "./cellules";
import type { Ligne } from "./cellules";

/** Header → cell text, non-empty cells only. A repeated header gets " (2)", " (3)"… */
export function ligneEnObjet(entetes: Ligne, ligne: Ligne): Record<string, string> {
  const objet: Record<string, string> = {};
  const vus = new Map<string, number>();
  entetes.forEach((entete, i) => {
    const base = String(entete ?? "").replace(/\s+/g, " ").trim() || `colonne ${i + 1}`;
    const rang = (vus.get(base) ?? 0) + 1;
    vus.set(base, rang);
    const valeur = texte(ligne[i]);
    if (valeur !== null) objet[rang === 1 ? base : `${base} (${rang})`] = valeur;
  });
  return objet;
}

/**
 * For PMI, JDG splits each long text into 250-character pieces ("1-4 …",
 * "2-4 …"). Glued back, the pieces must give the label text; when they do not,
 * PMI holds a different version from the label.
 */
export const DECOUPAGES_PMI: ReadonlyArray<{ complet: string; morceaux: string }> = [
  { complet: "NOUVEAU TEXTE COMMERCIAL FR 300 caractères espaces compris", morceaux: "Nouveau texte commercial FR" },
  { complet: "LISTE D'INGRÉDIENTS FR", morceaux: "Liste d'ingrédients" },
  { complet: "ALLÉGATIONS SANTÉ FR", morceaux: "allégation santé FR" },
  { complet: "PHRASE WFTO FR", morceaux: "Phrase WFTO FR" },
  { complet: "NOUVEAU TEXTE COMMERCIAL EN", morceaux: "Nouveau texte commercial EN" },
  { complet: "LISTE INGREDIENTS EN", morceaux: "liste d'ingrédients EN" },
  { complet: "ALLÉGATIONS SANTÉ EN", morceaux: "allégation santé EN" },
];

const RANGS = ["1-4", "2-4", "3-4", "4-4"] as const;
/**
 * Cells are trimmed when read, so a space falling exactly on a 250-character
 * cut disappears from one piece: spacing is ignored, words are not.
 */
const compact = (s: string) => s.replace(/\s+/g, "");

export interface EcartPmi {
  texte: string;
  complet: string;
  recolle: string;
}

export function ecartsDecoupagePmi(objet: Readonly<Record<string, string>>): EcartPmi[] {
  const ecarts: EcartPmi[] = [];
  for (const { complet, morceaux } of DECOUPAGES_PMI) {
    const pieces = RANGS.map((r) => objet[`${r} ${morceaux}`]).filter((p): p is string => p !== undefined);
    if (pieces.length === 0) continue;
    const texteComplet = objet[complet] ?? "";
    const recolle = pieces.join("");
    if (compact(recolle) !== compact(texteComplet)) ecarts.push({ texte: complet, complet: texteComplet, recolle });
  }
  return ecarts;
}
