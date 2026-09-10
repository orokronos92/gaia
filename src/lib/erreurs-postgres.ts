/**
 * Reconnaître une erreur Postgres à travers ce qui l'enveloppe.
 *
 * L'ORM ne relaie pas le code de l'erreur : il jette la sienne, avec la requête
 * en message, et range l'erreur du driver dans `cause`. Quatre endroits du code
 * testaient `e.code === "23505"` au premier niveau, ne trouvaient rien, et
 * relançaient — l'utilisateur recevait alors une page d'erreur au lieu de « ce
 * code est déjà pris ». Constaté le 2026-09-10 en enregistrant un code
 * étiquette déjà porté par une autre fiche.
 */

/** Profondeur de chaîne explorée — au-delà, ce n'est plus une cause, c'est un cycle. */
const PROFONDEUR_MAX = 6;

/** Le code d'erreur Postgres porté par `e` ou par l'une de ses causes. */
export function codePostgres(e: unknown): string | null {
  let cause: unknown = e;
  for (let n = 0; cause && n < PROFONDEUR_MAX; n++) {
    if (typeof cause !== "object") return null;
    const code = (cause as { code?: unknown }).code;
    if (typeof code === "string") return code;
    cause = (cause as { cause?: unknown }).cause;
  }
  return null;
}

/** Violation de contrainte d'unicité (23505), quel que soit l'emballage. */
export function estViolationUnicite(e: unknown): boolean {
  return codePostgres(e) === "23505";
}

/** Nom de la contrainte violée, quand le driver le donne — sinon null. */
export function contrainteViolee(e: unknown): string | null {
  let cause: unknown = e;
  for (let n = 0; cause && n < PROFONDEUR_MAX; n++) {
    if (typeof cause !== "object") return null;
    const nom = (cause as { constraint?: unknown }).constraint;
    if (typeof nom === "string") return nom;
    cause = (cause as { cause?: unknown }).cause;
  }
  return null;
}
