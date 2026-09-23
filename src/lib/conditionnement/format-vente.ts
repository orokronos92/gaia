/**
 * The sales format a product code designates (constat 2026-09-23): the 4th
 * digit after the family letters — TB404**2** is the ≈ 100 g retail pack of
 * Ché Chun, TB404**6** the ≈ 50 g one, TB404**1** the 1.5 kg bulk bag.
 */

/** Families whose last digit numbers variants, not formats (COF1201/1202/1203: three bricks). */
const FAMILLES_SANS_FORMAT: readonly string[] = ["COF"];

const CODE_AVEC_FORMAT = /^([A-Z]+?)(\d{3})(\d)$/;

/** The format digit of a product code, or null when the code carries none. */
export function chiffreDeFormat(codePf: string): string | null {
  const match = codePf.trim().toUpperCase().match(CODE_AVEC_FORMAT);
  if (!match) return null;
  const [, famille, , chiffre] = match;
  return FAMILLES_SANS_FORMAT.includes(famille) ? null : chiffre;
}
