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

/**
 * Same list separators as the pre-fill parser: a comma before a digit is a
 * decimal, not a separator. Applied only OUTSIDE parentheses — JDG writes
 * "arôme naturel (citron, mandarine) 2 %", and splitting inside it invented an
 * ingredient called "mandarine)" and an orphan percentage with it.
 */
const SEPARATEUR = /^(\s[–—-]\s|[;\n·]|,(?!\d))/;
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

/** Splits on list separators, ignoring anything nested in parentheses. */
function decouper(texte: string): string[] {
  const morceaux: string[] = [];
  let courant = "";
  let profondeur = 0;

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === "(" || c === "[") profondeur++;
    else if (c === ")" || c === "]") profondeur = Math.max(0, profondeur - 1);

    if (profondeur === 0) {
      const coupe = SEPARATEUR.exec(texte.slice(i));
      if (coupe) {
        morceaux.push(courant);
        courant = "";
        i += coupe[0].length - 1;
        continue;
      }
    }
    courant += c;
  }
  morceaux.push(courant);
  return morceaux;
}

export function lireListeDeclaree(texte: string | null | undefined): ListeDeclaree {
  if (!texte || texte.trim() === "") return { entrees: [], legende: null };

  const sansPrefixe = texte.replace(PREFIXE_LISTE, "");
  const coupure = DEBUT_LEGENDE.exec(sansPrefixe);
  const finListe = coupure ? coupure.index + coupure[0].indexOf(coupure[1]) : sansPrefixe.length;
  const partieListe = sansPrefixe.slice(0, finListe);
  const legende = coupure ? sansPrefixe.slice(finListe).trim() : null;

  const entrees: EntreeDeclaree[] = [];
  for (const brut of decouper(partieListe)) {
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
