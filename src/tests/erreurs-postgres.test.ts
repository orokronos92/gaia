import { describe, it, expect } from "vitest";
import { codePostgres, contrainteViolee, estViolationUnicite } from "@/lib/erreurs-postgres";

/**
 * L'ORM enveloppe l'erreur du driver : le code Postgres n'est jamais au premier
 * niveau. Quatre endroits le cherchaient là, ne le trouvaient pas, et
 * relançaient — l'écran affichait une page d'erreur au lieu de dire que le code
 * étiquette était déjà pris.
 */
const enveloppee = (interne: unknown) =>
  Object.assign(new Error("Failed query: update ..."), { cause: interne });

describe("erreurs Postgres à travers leur emballage", () => {
  it("trouve le code dans la cause, pas seulement à la surface", () => {
    const e = enveloppee(Object.assign(new Error("duplicate key"), { code: "23505" }));
    expect(codePostgres(e)).toBe("23505");
    expect(estViolationUnicite(e)).toBe(true);
  });

  it("trouve le code posé directement sur l'erreur", () => {
    expect(estViolationUnicite(Object.assign(new Error("x"), { code: "23505" }))).toBe(true);
  });

  it("descend plusieurs niveaux d'emballage", () => {
    const e = enveloppee(enveloppee(Object.assign(new Error("x"), { code: "23505" })));
    expect(estViolationUnicite(e)).toBe(true);
  });

  it("ne confond pas une autre erreur Postgres avec un doublon", () => {
    const e = enveloppee(Object.assign(new Error("null value"), { code: "23502" }));
    expect(codePostgres(e)).toBe("23502");
    expect(estViolationUnicite(e)).toBe(false);
  });

  it("nomme la contrainte violée quand le driver la donne", () => {
    const e = enveloppee(
      Object.assign(new Error("dup"), { code: "23505", constraint: "fiches_etiquettes_code_etiquette_unique" })
    );
    expect(contrainteViolee(e)).toBe("fiches_etiquettes_code_etiquette_unique");
  });

  it("ne boucle pas sur une cause circulaire", () => {
    const e: { cause?: unknown } = {};
    e.cause = e;
    expect(estViolationUnicite(e)).toBe(false);
  });

  it("supporte tout ce qui n'est pas une erreur", () => {
    expect(codePostgres(null)).toBeNull();
    expect(codePostgres("boum")).toBeNull();
    expect(estViolationUnicite(undefined)).toBe(false);
  });
});
