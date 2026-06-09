/**
 * Canonical JDG reference values for deterministic controls. These are the
 * strings/codes the regulation (PRO-QHS-013) requires verbatim on every JDG
 * label — a deterministic check is a normalized match against them.
 */

/** Lowercase, strip diacritics, collapse whitespace — for tolerant matching. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** PRO-QHS-013 §5 — mandatory conservation mention. */
export const MENTION_CONSERVATION_JDG =
  "À conserver à l'abri de l'humidité, de la lumière et de la chaleur";

/** PRO-QHS-013 §7 — manufacturer address. Matched by its invariant tokens. */
export const FABRICANT_JDG_TOKENS = [
  "jardins de gaia",
  "67820",
  "wittisheim",
] as const;

/** PRO-QHS-013 §11.1 — control-body code of the last operator (Ecocert France). */
export const CODE_OC_ATTENDU = "FR-BIO-01";
export const CODE_OC_PATTERN = /\bFR-BIO-\d{2}\b/i;

/** PRO-QHS-013 §3.3 — licorice (réglisse) detection keywords (designation scan). */
export const REGLISSE_KEYWORDS = ["reglisse", "glycyrrhiza"] as const;

/** PRO-QHS-013 §3.3 — invariant tokens of the JDG hypertension mention. */
export const MENTION_REGLISSE_TOKENS = ["reglisse", "hypertension"] as const;

/**
 * Fallback Camellia sinensis (tea) detection when no ingredient carries the
 * `estCamellia` flag yet. The flag is authoritative; this only catches gaps.
 */
export const CAMELLIA_KEYWORDS = [
  "camellia",
  "the vert",
  "the noir",
  "the blanc",
  "the sombre",
  "the fume",
] as const;

/** PRO-QHS-013 §4 — net-quantity mass units. */
export const MASS_UNIT_PATTERN = /\d+([.,]\d+)?\s*(mg|g|kg)\b/i;
