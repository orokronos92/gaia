import { describe, expect, it } from "vitest";
import { comparerListes, listeImprimee } from "../lib/audit/visual/comparaison-liste";
import { controlerCoherenceEtiquette } from "../lib/audit/visual/coherence-etiquette";
import type { AnalyseBat } from "../lib/utils/pdf-bat";

/** Texts as pdftotext -layout gives them, taken from the preprod BATs. */
describe("listeImprimee — la liste lue sur le BAT", () => {
  it("prend le titre français, pas l'anglais, et s'arrête à la note bio", () => {
    const bat = `INGRÉDIENTS\nThé vert*, arômes naturels de (pomme*, poire*) 4%,\n morceaux de pomme* 2%, pétales de rose*.\n *Issu de l'agriculture biologique.\n\nINGREDIENTS\nGreen tea*, rose petals*.`;
    expect(listeImprimee(bat)).toEqual(["Thé vert*", "arômes naturels de (pomme*, poire*) 4%", "morceaux de pomme* 2%", "pétales de rose*"]);
  });

  it("ignore « ingrédients » dans une phrase (TR2452)", () => {
    const bat = `à l'image des ingrédients qui la composent.\n   INGRÉDIENTS\n Rooibos*, cannelle*.`;
    expect(listeImprimee(bat)).toEqual(["Rooibos*", "cannelle*"]);
  });

  it("recolle un mot coupé en fin de ligne", () => {
    expect(listeImprimee("Ingrédients : lemongrass* (Cymbo-\npogon citratus) 32%, mélisse*.")).toEqual(["lemongrass* (Cymbopogon citratus) 32%", "mélisse*"]);
  });

  it("null quand le BAT ne porte pas la liste en texte", () => {
    expect(listeImprimee("Thé vert*, arôme naturel de cerise* 5%")).toBeNull();
  });
});

describe("comparerListes — seulement les écarts", () => {
  it("rien quand tout concorde, casse et espaces du % ignorés", () => {
    expect(comparerListes(["thé vert*", "menthe* 15%"], ["Thé vert*", "menthe* 15 %"])).toEqual([]);
  });

  it("un ingrédient remplacé : ce que dit la fiche, ce qu'imprime l'étiquette (TA6942)", () => {
    expect(comparerListes(["thé vert*", "pétales de fleurs*"], ["Thé vert*", "pétales de rose*"])).toEqual([
      { type: "different", fiche: "pétales de fleurs*", etiquette: "pétales de rose*" },
    ]);
  });

  it("pourcentages différents et ingrédient en plus (TM0256)", () => {
    expect(comparerListes(["thé blanc* 49%", "lemongrass* 12%", "pétales de rose*"], ["Thé blanc* 48%", "lemongrass* 12%", "pétales de rose*", "amarante*"])).toEqual([
      { type: "different", fiche: "thé blanc* 49%", etiquette: "Thé blanc* 48%" },
      { type: "en_plus", etiquette: "amarante*" },
    ]);
  });

  it("ordre changé (TM0306)", () => {
    expect(comparerListes(["romarin*", "groseille*", "tilleul*", "mélisse*"], ["tilleul*", "romarin*", "groseille*", "mélisse*"])).toEqual([
      { type: "ordre", element: "tilleul*", rangFiche: 3, rangEtiquette: 1 },
    ]);
  });

  it("ingrédient absent de l'étiquette", () => {
    expect(comparerListes(["thé noir*", "lavande*", "souci*"], ["Thé noir*", "souci*"])).toEqual([{ type: "manque", fiche: "lavande*" }]);
  });

  it("un mot de la colonne voisine n'est pas un écart (TUTA6152)", () => {
    expect(comparerListes(["thé vert*", "morceaux de mangue* 3%"], ["TASSES Thé vert*", "morceaux de Douceur mangue* 3%"])).toEqual([]);
  });

  it("un nom latin en plus sur la fiche reste un écart", () => {
    expect(comparerListes(["feuilles de mûrier blanc du Japon (Morus Alba)"], ["feuilles de mûrier blanc du Japon"])).toHaveLength(1);
  });
});

const face = (texte: string): AnalyseBat => {
  const mots = texte.split(/\s+/).filter(Boolean);
  return {
    pages: [{ largeurPt: 200, hauteurPt: 400, coupe: null, rognage: { x0: 0, y0: 0, x1: 200, y1: 400 }, mots: mots.map((t) => ({ texte: t, x: 0, y: 0, largeur: 10, hauteur: 5, corpsPt: 7, police: "Test" })) }],
    polices: {},
    traces: [],
    texte: mots.join(" "),
  };
};

describe("2.5 sans recette : la liste de l'Excel face au BAT", () => {
  const BAT = "INGRÉDIENTS\nThé vert*, arômes naturels de (pomme*, poire*) 4%, pétales de rose*.\n*Issu de l'agriculture biologique.";
  const EXCEL = "Ingrédients : thé vert*, arômes naturels de (pomme*, poire*) 4%, pétales de fleurs*. *Issu de l'agriculture biologique.";

  it("FAIL qui porte le face-à-face et montre le mot sur le BAT", () => {
    const r = controlerCoherenceEtiquette([face(BAT)], { ingredients: EXCEL, sourceListe: "excel", texteBat: BAT });
    expect(r?.checklistId).toBe("2.5");
    expect(r?.statut).toBe("FAIL");
    expect(r?.comparaisonListe?.ecarts).toEqual([{ type: "different", fiche: "pétales de fleurs*", etiquette: "pétales de rose*" }]);
    expect(r?.comparaisonListe?.total).toBe(3);
    expect(r?.justification).toContain("« pétales de rose* »");
    expect(r?.reperes).toHaveLength(1);
  });

  it("PASS sans rien afficher quand tout concorde", () => {
    const r = controlerCoherenceEtiquette([face(BAT)], { ingredients: EXCEL.replace("fleurs", "rose"), sourceListe: "excel", texteBat: BAT });
    expect(r?.statut).toBe("PASS");
    expect(r?.comparaisonListe).toBeUndefined();
  });

  it("liste illisible sur le BAT : à regarder à l'œil, pas une faute", () => {
    const r = controlerCoherenceEtiquette([face("")], { ingredients: EXCEL, sourceListe: "excel", texteBat: "Thé vert*" });
    expect(r?.statut).toBe("WARNING");
    expect(r?.justification).toContain("à comparer à l'œil");
  });

  it("ni recette ni liste : la fiche est à compléter", () => {
    const r = controlerCoherenceEtiquette([face(BAT)], { texteBat: BAT });
    expect(r?.statut).toBe("WARNING");
    expect(r?.manqueSurLaFiche).toBe("liste d'ingrédients");
  });
});
