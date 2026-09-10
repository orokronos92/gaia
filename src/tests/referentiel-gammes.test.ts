import { describe, it, expect } from "vitest";
import { doublonsProbables, formeRapprochement } from "@/lib/referentiels/gammes";

/**
 * Les doublons relevés dans le catalogue le 2026-09-10 : 12 libellés de gamme
 * pour environ 7 gammes réelles, parce que le champ était une saisie libre.
 */
describe("rapprochement des gammes", () => {
  it("réduit l'article, la casse, les accents et le pluriel", () => {
    expect(formeRapprochement("LES GRANDS CLASSIQUES")).toBe("GRAND CLASSIQUE");
    expect(formeRapprochement("Grand classiques")).toBe("GRAND CLASSIQUE");
    expect(formeRapprochement("LES ENGAGÉS")).toBe(formeRapprochement("Les Engagés"));
  });

  it("garde les mots courts intacts — « LES » n'est pas « LE »", () => {
    expect(formeRapprochement("LES CRUS")).toBe("CRU");
    expect(formeRapprochement("THÉS")).toBe("THE");
  });

  it("rapproche les deux écritures des Grands Classiques et des Engagés", () => {
    const groupes = doublonsProbables([
      { id: "1", nom: "LES GRANDS CLASSIQUES" },
      { id: "2", nom: "Grand classiques" },
      { id: "3", nom: "LES ENGAGÉS" },
      { id: "4", nom: "Les Engagés" },
      { id: "5", nom: "LES BIENFAITRICES" },
    ]);
    expect(groupes).toHaveLength(2);
    expect(groupes.flat().map((g) => g.id).sort()).toEqual(["1", "2", "3", "4"]);
  });

  it("ne rapproche PAS « Les Militants » des « Engagés » — c'est une décision métier", () => {
    const groupes = doublonsProbables([
      { id: "1", nom: "LES ENGAGÉS" },
      { id: "2", nom: "Les Militants" },
    ]);
    expect(groupes).toEqual([]);
  });

  it("une gamme seule de son espèce ne fait pas un groupe", () => {
    expect(doublonsProbables([{ id: "1", nom: "LES GRANDS CRUS" }])).toEqual([]);
  });
});
