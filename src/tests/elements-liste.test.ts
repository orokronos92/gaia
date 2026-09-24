import { describe, expect, it } from "vitest";
import { elementsListe } from "../lib/audit/visual/elements-liste";
import { runTextRobot } from "../lib/audit/visual/text-robot";

/** Workbook cells as they are in docs/sources/BDD étiquettes 2025 v2.xlsx. */
describe("elementsListe — la liste de l'Excel réduite à ses ingrédients", () => {
  it("retire l'en-tête et la note bio", () => {
    expect(elementsListe("Ingrédients : thé noir*, guarana*, fleurs d'osmanthe*. *Issu de l'agriculture biologique.").elements)
      .toEqual(["thé noir*", "guarana*", "fleurs d'osmanthe*"]);
  });

  it("garde entières les virgules entre parenthèses (TA6752, TF1412)", () => {
    expect(elementsListe("Ingrédients : thé vert*, arômes naturels de (poire*, litchi) 11%, pétales de fleurs*.").elements)
      .toEqual(["thé vert*", "arômes naturels de (poire*, litchi) 11%", "pétales de fleurs*"]);
  });

  it("garde entiers les décimaux, à la virgule comme au point", () => {
    expect(elementsListe("huiles essentielles* 3,5%, menthe* 15.5 %.").elements).toEqual(["huiles essentielles* 3,5%", "menthe* 15.5 %"]);
  });

  it("virgule sans espace dans l'Excel (TM0306)", () => {
    expect(elementsListe("Ingrédients : groseille*, tilleul*,mélisse*.").elements).toEqual(["groseille*", "tilleul*", "mélisse*"]);
  });

  it("un seul ingrédient, sans note collée (TN2292, TH220)", () => {
    expect(elementsListe("Ingrédient : verveine odorante* (Aloysia citrodora). *Issu de l'agriculture biologique.").elements)
      .toEqual(["verveine odorante* (Aloysia citrodora)"]);
  });

  it("note collée à la parenthèse fermante (TA7062)", () => {
    expect(elementsListe("Ingrédients : thé noir*, morceaux de caramel* 5 % (sucre de canne*, fleur de sel).*Issu de l'agriculture biologique.").elements)
      .toEqual(["thé noir*", "morceaux de caramel* 5 % (sucre de canne*, fleur de sel)"]);
  });

  it("ignore le paragraphe suivant, et signale une seconde liste (TR2212)", () => {
    const r = elementsListe("Ingrédients : rooibos*, amarante*. *Issu de l’agriculture biologique.\n\nRecette à venir fin 2026\nIngrédients : rooibos*, morceaux de pomme*.");
    expect(r.elements).toEqual(["rooibos*", "amarante*"]);
    expect(r.autreListeIgnoree).toBe(true);
  });

  it("une mention après la liste n'est pas une seconde liste (TA0866)", () => {
    const r = elementsListe("Ingrédients : réglisse*, cardamome*. *Issu de l’agriculture biologique.\nContient de la réglisse, les personnes souffrant d'hypertension doivent éviter toute consommation excessive.");
    expect(r.elements).toEqual(["réglisse*", "cardamome*"]);
    expect(r.autreListeIgnoree).toBe(false);
  });

  it("en-tête seul sur sa ligne, espace insécable", () => {
    expect(elementsListe("Ingrédients :\nthé vert*, menthe*.").elements).toEqual(["thé vert*", "menthe*"]);
  });

  it("liste générée par la recette étiquette : inchangée", () => {
    expect(elementsListe("thé noir* 62 %, guarana*.").elements).toEqual(["thé noir* 62 %", "guarana*"]);
  });
});

describe("TXT_INGREDIENTS sur une liste de l'Excel", () => {
  const BAT = "INGRÉDIENTS : thé vert*, arômes naturels de (poire*, litchi) 11 %, pétales de fleurs*. *Issu de l'agriculture biologique.";

  it("PASS quand le BAT imprime la même liste, en-tête en majuscules", () => {
    const r = runTextRobot(BAT, { ingredients: "Ingrédients : thé vert*, arômes naturels de (poire*, litchi) 11%, pétales de fleurs*. *Issu de l’agriculture biologique." });
    expect(r.find((c) => c.id === "TXT_INGREDIENTS")?.statut).toBe("PASS");
  });

  it("FAIL qui nomme le seul ingrédient divergent (TA6942 : fleurs → rose)", () => {
    const r = runTextRobot(BAT.replace("pétales de fleurs*", "pétales de rose*"), { ingredients: "Ingrédients : thé vert*, pétales de fleurs*." });
    const check = r.find((c) => c.id === "TXT_INGREDIENTS");
    expect(check?.statut).toBe("FAIL");
    expect(check?.justification).toBe("Non retrouvé(s) à l'identique sur le BAT : pétales de fleurs*.");
  });

  it("apostrophes courbes et droites confondues", () => {
    const r = runTextRobot("écorces d'orange*", { ingredients: "écorces d’orange*." });
    expect(r.find((c) => c.id === "TXT_INGREDIENTS")?.statut).toBe("PASS");
  });
});
