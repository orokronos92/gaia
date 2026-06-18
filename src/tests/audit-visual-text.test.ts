import { describe, it, expect } from "vitest";
import { runTextRobot, type BatTextCheck, type BatTextInput } from "../lib/audit/visual/text-robot";

/**
 * Golden MT265 — real text extracted by pdf2json from the actual BATs in MinIO
 * (facing ETMT2652V5 + contre ETCMT2652V5), concatenated as the orchestrator
 * will feed it. Keeps the robot honest against the genuine artwork, not a mock.
 */
const BAT_MT265 = `Maté
sportif
CERTIFIÉ PAR FR-BIO-01 AGRICULTURE UE/non UE
CONDITIONNÉ À LA MAIN EN ALSACE
LES BIENFAITRICES
STIMULANT & TONIQUE
INFUSION AROMATISÉE
HUILE ESSENTIELLE D'ORANGE SANGUINE
GINGEMBRE - HIBISCUS
LES JARDINS DE GAÏA
Membre certifié World Fair Trade Organization, Les Jardins de Gaïa
s'engagent pour un commerce plus juste. Pour en savoir plus : www.wfto.com.
ETCMT2652V5
poids net
100g
50
TASSES
2g /
TASSE
3min
95°C
Maté sportif
Naturellement stimulante, cette recette à base de maté.
INGRÉDIENTS
maté vert* 62%, gingembre* 15,5%, guarana* 6%,
hibiscus* 6%, menthe poivrée*, huile essentielle
d'orange sanguine* 4%, ginseng* 2%, stevia*.
*Issu de l'agriculture biologique.
Consommation journalière conseillée : 3 tasses de 25 cl.`;

const FICHE_MT265: BatTextInput = {
  denomination: "Maté sportif",
  ingredients:
    "maté vert* 62%, gingembre* 15,5%, guarana* 6%, hibiscus* 6%, menthe poivrée*, huile essentielle d'orange sanguine* 4%, ginseng* 2%, stevia*. *Issu de l'agriculture biologique.",
  allegation: "Consommation journalière conseillée : 3 tasses de 25 cl.",
  allergenes: "non",
  poidsNet: "100 g",
  codeEtiquette: "ETCMT2652V5",
  mentionConservation: "À conserver à l'abri de l'humidité, de la lumière et de la chaleur",
  mentionFabricant: "LES JARDINS DE GAÏA – Z.A. – 6 rue de l'Écluse – FR-67820 Wittisheim",
};

const byId = (r: BatTextCheck[], id: string): BatTextCheck => {
  const c = r.find((x) => x.id === id);
  if (!c) throw new Error(`check ${id} absent`);
  return c;
};

describe("Robot Texte — golden MT265", () => {
  it("confirme ce qui figure sur le BAT, signale ce qui manque", () => {
    const r = runTextRobot(BAT_MT265, FICHE_MT265);

    // Présents sur le BAT → PASS (le % décimal 15,5 ne casse pas le découpage).
    expect(byId(r, "TXT_INGREDIENTS").statut).toBe("PASS");
    expect(byId(r, "TXT_DENOMINATION").statut).toBe("PASS");
    expect(byId(r, "TXT_POIDS_NET").statut).toBe("PASS"); // "100 g" fiche ↔ "100g" BAT
    expect(byId(r, "TXT_CODE_ETIQUETTE").statut).toBe("PASS");

    // L'allégation n'est PAS un contrôle déterministe (formulation libre) → LLM/vision.
    expect(r.find((x) => x.id === "TXT_ALLEGATION")).toBeUndefined();

    // Mentions obligatoires absentes des faces analysées → WARNING (pas FAIL).
    expect(byId(r, "TXT_CONSERVATION").statut).toBe("WARNING");
    expect(byId(r, "TXT_FABRICANT").statut).toBe("WARNING"); // adresse JDG non imprimée

    // Allergènes "non" → non déclaré → pas de contrôle généré.
    expect(r.find((x) => x.id === "TXT_ALLERGENES")).toBeUndefined();
  });

  it("attrape une divergence de % comme un FAIL", () => {
    const tampered = BAT_MT265.replace("maté vert* 62%", "maté vert* 60%");
    const r = runTextRobot(tampered, FICHE_MT265);
    const ingr = byId(r, "TXT_INGREDIENTS");
    expect(ingr.statut).toBe("FAIL");
    expect(ingr.justification).toContain("maté vert* 62%");
  });

  it("tolère un ingrédient masqué (sans %) — pas de faux mismatch", () => {
    // Guarana masqué côté fiche (juste le nom), le BAT affiche encore "guarana* 6%".
    // L'item masqué = son nom → retrouvé en sous-chaîne, donc PASS et non FAIL.
    const ficheMasquee: BatTextInput = {
      ...FICHE_MT265,
      ingredients: FICHE_MT265.ingredients!.replace("guarana* 6%", "guarana*"),
    };
    const r = runTextRobot(BAT_MT265, ficheMasquee);
    expect(byId(r, "TXT_INGREDIENTS").statut).toBe("PASS");
  });

  it("WARNING honnête quand la fiche n'a pas la donnée", () => {
    const r = runTextRobot(BAT_MT265, { ingredients: null });
    expect(byId(r, "TXT_INGREDIENTS").statut).toBe("WARNING");
    expect(byId(r, "TXT_DENOMINATION").statut).toBe("WARNING");
  });
});
