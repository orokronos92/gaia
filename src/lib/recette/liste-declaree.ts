/**
 * Reads the DECLARED ingredient list — the label copy, markers included.
 *
 * This list is not ours: it is copied verbatim from the dégustation sheet, where
 * JDG writes the consumer-facing wording by hand ("thé noir*", not the recette's
 * supplier name "SORWATHE OP1"). It is the text the audit compares to the BAT,
 * so nothing here rewrites it — this only reads what it claims.
 *
 * `parse-ingredients.ts` strips the markers because it pre-fills the calculator
 * and only needs designations. Here the markers ARE the subject: one star is
 * organic, two are Demeter, and a Demeter recipe whose label carries no double
 * star is a certification the product claims in one document and denies in the
 * other. That divergence is what control 2.5 reports.
 */

/** Trailing legend, e.g. "*Issu de l'agriculture biologique." — not an ingredient. */
const DEBUT_LEGENDE = /(?:^|[.;])\s*(\*+)\s*[A-Za-zÀ-ÖØ-öø-ÿ]/;

/** Same list separators as the pre-fill parser: a comma before a digit is a decimal. */
const SEPARATEURS = /\s[–—-]\s|[;\n·]|,(?!\d)/g;
const POURCENT = /(\d+(?:[.,]\d+)?)\s*%/;
const PREFIXE_LISTE = /^\s*(liste\s+d['’]ingr[ée]dient[s]?|ingr[ée]dients?)\s*:?\s*/i;

export interface EntreeDeclaree {
  designation: string;
  /** Number of stars carried: 0 none, 1 organic, 2 Demeter. */
  marqueurs: number;
  pourcentage: number | null;
}

export interface ListeDeclaree {
  entrees: EntreeDeclaree[];
  /** The certification legend, when the list carries one. */
  legende: string | null;
}

export function lireListeDeclaree(texte: string | null | undefined): ListeDeclaree {
  if (!texte || texte.trim() === "") return { entrees: [], legende: null };

  const sansPrefixe = texte.replace(PREFIXE_LISTE, "");
  const coupure = DEBUT_LEGENDE.exec(sansPrefixe);
  const finListe = coupure ? coupure.index + coupure[0].indexOf(coupure[1]) : sansPrefixe.length;
  const partieListe = sansPrefixe.slice(0, finListe);
  const legende = coupure ? sansPrefixe.slice(finListe).trim() : null;

  const entrees: EntreeDeclaree[] = [];
  for (const brut of partieListe.split(SEPARATEURS)) {
    const token = brut.trim();
    if (token === "") continue;

    const etoiles = [...token.matchAll(/\*+/g)].reduce((n, m) => Math.max(n, m[0].length), 0);
    const pct = POURCENT.exec(token);
    const designation = token
      .replace(new RegExp(POURCENT, "g"), "")
      .replace(/\*+/g, "")
      .replace(/\(\s*bio\s*\)/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .replace(/[.,;:]+$/, "")
      .trim();

    if (designation === "") continue;
    entrees.push({
      designation,
      marqueurs: etoiles,
      pourcentage: pct ? Number(pct[1].replace(",", ".")) : null,
    });
  }
  return { entrees, legende: legende && legende !== "" ? legende : null };
}
