/**
 * Whether a label file belongs on a product, and which of a product's files is
 * the current one. Rules drawn from the v2 workbook and the PDFs
 * (docs/decisions/2026-09-23-constat-conditionnements.md §5):
 * - a bulk product printed in-house (digit 1, 5 or 7, no reference) has no BAT;
 * - where the workbook names a reference for a face, only that reference's file
 *   goes on it (TB4042's facing is ETBN4042, not the shared-looking ETBN404);
 * - otherwise a file whose code carries a packaging digit belongs to that format only
 *   (ETCBN4046 → TB4046, never TB4042), and to its own article number;
 * - one current file per product and face: highest version, latest vintage,
 *   and the September sort over the March copy of the same file.
 */
import { chiffreDeFormat } from "./format-vente";

/** Bulk formats: the label is printed in-house, the Graphics team sends nothing. */
const CHIFFRES_VRAC: readonly string[] = ["1", "5", "7"];
const PREFIXE_TRI_SEPTEMBRE = "ÉTIQUETTES 2026-09/";

export interface CodeFichier {
  /** Reference without version: ETCBN4046. */
  base: string;
  contre: boolean;
  numero: string;
  chiffre: string | null;
  version: number;
}

/** ETCBN4046V6 Ché Chun.pdf → contre, article 404, format 6, version 6. Null when the name carries no ET code. */
export function lireCodeFichier(nomFichier: string): CodeFichier | null {
  const nom = nomFichier.toUpperCase().replace(/\s+/g, "");
  const m = nom.match(/^ET(C?)([A-Z]+?)(\d{3})(\d?)(?:FF\d{2})?V(\d+)/);
  if (!m) return null;
  const [, c, lettres, numero, brut, version] = m;
  // The older naming closed codes with a 0 (ETHN5010V5): formats run 1 to 7, so 0 is no format.
  const chiffre = brut === "0" ? "" : brut;
  return { base: `ET${c}${lettres}${numero}${chiffre}`, contre: c === "C", numero, chiffre: chiffre || null, version: Number(version) };
}

export interface ProduitPourBat {
  codePf: string;
  refFacing: string | null;
  refContre: string | null;
}

/**
 * `reference` is the soft rule: the workbook sometimes carries a typo
 * (ETHN2146 for the back label ETCHN2146), so a file that only disagrees with
 * the workbook is set aside only where the file the workbook names is there.
 */
export type Regle = "vrac" | "reference" | "article" | "format";
export type Verdict = { ok: true } | { ok: false; regle: Regle; motif: string; attendu?: string };

export function verifierCompatibilite(produit: ProduitPourBat, nomFichier: string): Verdict {
  const chiffre = chiffreDeFormat(produit.codePf);
  if (chiffre && CHIFFRES_VRAC.includes(chiffre) && !produit.refFacing && !produit.refContre) {
    return { ok: false, regle: "vrac", motif: "vrac à étiquette interne : aucun BAT graphiste attendu" };
  }
  const code = lireCodeFichier(nomFichier);
  const numero = produit.codePf.match(/^[A-Z]+?(\d{3})/)?.[1];
  if (code && numero && chiffre !== null && code.numero !== numero) return { ok: false, regle: "article", motif: `BAT d'un autre article (${code.base})` };
  if (code && chiffre !== null && code.chiffre !== null && code.chiffre !== chiffre) return { ok: false, regle: "format", motif: `BAT d'un autre format (chiffre ${code.chiffre}, produit en ${chiffre})` };
  const reference = code ? (code.contre ? produit.refContre : produit.refFacing) : null;
  const attendu = reference ? lireCodeFichier(reference)?.base : undefined;
  if (code && attendu && attendu !== code.base) {
    return { ok: false, regle: "reference", attendu, motif: `l'Excel attend ${reference} sur cette face, pas ${code.base}` };
  }
  return { ok: true };
}

/** The hard rules only: what the linking must never do, whatever the workbook's typos. */
export const regleDure = (verdict: Verdict): boolean => !verdict.ok && verdict.regle !== "reference";

export interface LienBat {
  id: string;
  produitId: string;
  /** A BAT (PDF) and its source (.ai) share a reference and are both current. */
  type?: string;
  cleS3: string;
  nomFichier: string;
}

const ANNEE = /20\d{2}/;

/** Name stripped of codes, vintage and extension: "TN5502 Black Evidence 2025.pdf" → "BLACKEVIDENCE". */
function nomSansCode(nomFichier: string): string {
  return nomFichier
    .toUpperCase()
    .replace(/\.[A-Z]+$/, "")
    .replace(/_/g, " ")
    .replace(/\bET[A-Z0-9]+|\b[A-Z]{2,4}\d{3,4}\b/g, "")
    .replace(ANNEE, "")
    .replace(/VOLUMINEUX/g, "")
    .replace(/[^A-Z]/g, "");
}

/**
 * Among a product's compatible files, the ones that are not current: an older
 * version of the same reference, an older vintage of the same Grand Cru, or
 * the March copy of a file the September sort also holds. Keyed by link id.
 */
export function versionsDepassees(liens: readonly LienBat[]): Map<string, string> {
  // A vintage in the name groups by name, code or not: "ETNN550V5 BLACK EVIDENCE
  // 2026" and "TN5502 Black Evidence 2025" are two vintages of one label.
  const cleDe = (l: LienBat) => {
    const code = lireCodeFichier(l.nomFichier);
    if (ANNEE.test(l.nomFichier)) return `millesime:${nomSansCode(l.nomFichier)}`;
    return code ? code.base : `sans code:${nomSansCode(l.nomFichier)}`;
  };
  const rang = (l: LienBat) => Number(l.nomFichier.match(ANNEE)?.[0] ?? lireCodeFichier(l.nomFichier)?.version ?? 0);
  const septembre = (l: LienBat) => Number(l.cleS3.startsWith(PREFIXE_TRI_SEPTEMBRE));
  const groupes = new Map<string, LienBat[]>();
  for (const lien of liens) {
    const cle = `${lien.produitId}|${lien.type ?? ""}|${cleDe(lien)}`;
    groupes.set(cle, [...(groupes.get(cle) ?? []), lien]);
  }
  const depasses = new Map<string, string>();
  for (const groupe of groupes.values()) {
    const trie = [...groupe].sort((a, b) => rang(b) - rang(a) || septembre(b) - septembre(a));
    const [courant, ...autres] = trie;
    // Same rank: only a copy of a file already kept is redundant; two names may be two faces.
    const gardes = new Set([courant.nomFichier]);
    for (const autre of autres) {
      if (rang(autre) < rang(courant)) depasses.set(autre.id, `version dépassée par ${courant.nomFichier}`);
      else if (gardes.has(autre.nomFichier) || lireCodeFichier(autre.nomFichier) !== null) {
        depasses.set(autre.id, `doublon de ${septembre(courant) ? "l'envoi de septembre" : courant.nomFichier}`);
      } else gardes.add(autre.nomFichier);
    }
  }
  return depasses;
}
