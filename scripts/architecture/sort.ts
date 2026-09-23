/** Locale-independent string order, so the output is identical on every machine. */
export function byText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
