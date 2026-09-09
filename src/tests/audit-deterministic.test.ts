import { describe, it, expect } from "vitest";
import { computeRecette, type IngredientRecetteInput } from "../lib/business-rules/recette";
import { auditDeterministic } from "../lib/audit/deterministic";
import type { AuditIngredient, AuditInput, ControlResult } from "../lib/audit/types";

// Golden MT265 (MT165_MATE_SPORTIF.xlsx). Maté is Ilex paraguariensis, NOT
// Camellia sinensis → estCamellia stays false → control 1.1 is NA, as in the
// reference audit Ouro provided.
const MT265: IngredientRecetteInput[] = [
  { codeArticle: "MT100", designation: "Maté vert", quantiteKg: 10, estDemeter: false, estEquitable: false },
  { codeArticle: "EF015", designation: "Gingembre", quantiteKg: 2.5, estDemeter: false, estEquitable: false },
  { codeArticle: "EF033", designation: "Guarana", quantiteKg: 1, estDemeter: false, estEquitable: false },
  { codeArticle: "TF150", designation: "Hibiscus", quantiteKg: 1, estDemeter: false, estEquitable: false },
  { codeArticle: "AS002", designation: "HE orange sanguine", quantiteKg: 0.6, estDemeter: false, estEquitable: false },
  { codeArticle: "EF020", designation: "Menthe poivrée", quantiteKg: 0.6, estDemeter: false, estEquitable: false },
  { codeArticle: "EF055", designation: "Ginseng", quantiteKg: 0.3, estDemeter: false, estEquitable: false },
  { codeArticle: "TF175B", designation: "Stévia", quantiteKg: 0.08, estDemeter: false, estEquitable: false },
];

/** Maps the engine output to audit ingredient lines (estCamellia false by default). */
function buildIngredients(overrides: Partial<AuditIngredient> = {}): AuditIngredient[] {
  const calc = computeRecette({ ingredients: MT265, precisionArrondi: 0.5 });
  return calc.ingredients.map((i) => ({
    codeArticle: i.codeArticle,
    designation: i.designation,
    quantiteKg: i.quantiteKg,
    pourcentageBrut: i.pourcentageBrut,
    pourcentageEtiquette: i.pourcentageEtiquette,
    estDemeter: i.estDemeter,
    estEquitable: i.estEquitable,
    estCamellia: false,
    pourcentageMasque: false,
    ordreTri: i.ordreTri,
    ...overrides,
  }));
}

const byId = (results: ControlResult[], id: string): ControlResult => {
  const r = results.find((x) => x.id === id);
  if (!r) throw new Error(`control ${id} absent du résultat`);
  return r;
};

const INGREDIENTS_TEXTE =
  "maté vert* 62%, gingembre* 15,5%, guarana* 6%, hibiscus* 6%, menthe poivrée*, huile essentielle d'orange sanguine* 4%, ginseng* 2%, stevia*";

describe("Voie A déterministe — golden MT265", () => {
  // 12 points PRO-QHS-013 + 4 points MOP-PRO-029 (code article et Gencode).
  it("couvre les 18 points déterministes et valide chaque verdict (Zod)", () => {
    const input: AuditInput = {
      fiche: { ingredientsFr: INGREDIENTS_TEXTE, allergenes: "non" },
      produit: { typeTheFr: "Mélange de plantes", estAromatise: true },
      ingredients: buildIngredients(),
    };
    const r = auditDeterministic(input);
    expect(r).toHaveLength(18);
    // Every verdict carries a justification and a valid status.
    for (const c of r) {
      expect(c.mode).toBe("deterministic");
      expect(c.justification && c.justification.length > 0).toBe(true);
    }
  });

  it("données partielles : ancres reproductibles + WARNING honnête sur le manquant", () => {
    const input: AuditInput = {
      fiche: {
        ingredientsFr: INGREDIENTS_TEXTE,
        allergenes: "non",
        mentionConservation: null,
        mentionFabricant: null,
        codeEtiquette: null,
      },
      produit: { typeTheFr: "Mélange de plantes", estAromatise: true, poidsNet: null, codeOc: null, contientReglisse: false },
      ingredients: buildIngredients(),
    };
    const r = auditDeterministic(input);

    // Ancres dures (moteur) — non négociables.
    expect(byId(r, "3.2").statut).toBe("PASS"); // ROUNDING reproduit le golden
    expect(byId(r, "3.3").statut).toBe("PASS"); // Σ = 100
    expect(byId(r, "2.2").statut).toBe("PASS"); // ordre décroissant
    expect(byId(r, "3.1").statut).toBe("PASS"); // % déclaré partout

    // Applicabilité → NA (comme l'audit de référence).
    expect(byId(r, "1.1").statut).toBe("NA"); // pas de Camellia
    expect(byId(r, "2.3").statut).toBe("NA"); // multi-ingrédients
    expect(byId(r, "5.1").statut).toBe("NA"); // allergènes "non"
    expect(byId(r, "5.3").statut).toBe("NA"); // pas de réglisse

    // Donnée absente → WARNING (jamais un PASS silencieux).
    expect(byId(r, "6.1").statut).toBe("WARNING"); // poids net absent
    expect(byId(r, "7.2").statut).toBe("WARNING"); // mention conservation absente
    expect(byId(r, "9.1").statut).toBe("WARNING"); // adresse absente
    expect(byId(r, "15.1").statut).toBe("WARNING"); // code étiquette absent
  });

  it("données complètes conformes : les branches PASS s'allument", () => {
    const input: AuditInput = {
      fiche: {
        ingredientsFr: `Ingrédients : ${INGREDIENTS_TEXTE}`,
        allergenes: "non",
        mentionConservation: "À conserver à l'abri de l'humidité, de la lumière et de la chaleur",
        mentionFabricant: "LES JARDINS DE GAÏA – Z.A. – 6 rue de l'Écluse – FR-67820 Wittisheim",
        codeEtiquette: "ET-MT265",
      },
      produit: {
        typeTheFr: "Mélange de plantes",
        estAromatise: true,
        poidsNet: "100 g",
        codeOc: "FR-BIO-01",
        contientReglisse: false,
      },
      ingredients: buildIngredients(),
    };
    const r = auditDeterministic(input);
    expect(byId(r, "6.1").statut).toBe("PASS");
    expect(byId(r, "7.2").statut).toBe("PASS");
    expect(byId(r, "9.1").statut).toBe("PASS");
    expect(byId(r, "15.1").statut).toBe("PASS");
  });

  it("non-conformités : la voie les attrape en FAIL", () => {
    // Maté forcé à 63 % (golden = 62) → arrondi faux ET total = 101.
    const tampered = buildIngredients().map((i) =>
      i.codeArticle === "MT100" ? { ...i, pourcentageEtiquette: 63 } : i
    );
    const input: AuditInput = {
      fiche: { ingredientsFr: INGREDIENTS_TEXTE },
      produit: { poidsNet: "50 ml" }, // volume au lieu de masse
      ingredients: tampered,
    };
    const r = auditDeterministic(input);
    expect(byId(r, "3.2").statut).toBe("FAIL"); // ne reproduit pas le moteur
    expect(byId(r, "3.3").statut).toBe("FAIL"); // Σ = 101
    expect(byId(r, "6.1").statut).toBe("FAIL"); // volume interdit
  });

  it("% masqué (secret industriel) → 3.1 WARNING, pas FAIL ; 3.2/3.3 intacts", () => {
    // Marie masque le % du guarana ; le vrai % reste en base.
    const avecMasque = buildIngredients().map((i) =>
      i.codeArticle === "EF033" ? { ...i, pourcentageMasque: true } : i
    );
    const input: AuditInput = {
      fiche: { ingredientsFr: INGREDIENTS_TEXTE },
      produit: {},
      ingredients: avecMasque,
    };
    const r = auditDeterministic(input);
    // Omission volontaire validée → trace explicite, jamais un FAIL.
    expect(byId(r, "3.1").statut).toBe("WARNING");
    // Le masquage est purement d'affichage : la maths d'arrondi/total ne bouge pas.
    expect(byId(r, "3.2").statut).toBe("PASS");
    expect(byId(r, "3.3").statut).toBe("PASS");
  });

  it("réglisse détectée par scan (sans flag) → 5.3 applicable", () => {
    const avecReglisse: AuditIngredient[] = [
      ...buildIngredients(),
      {
        codeArticle: "EF099",
        designation: "Réglisse",
        quantiteKg: 0.5,
        pourcentageBrut: 3,
        pourcentageEtiquette: 3,
        estDemeter: false,
        estEquitable: false,
        estCamellia: false,
        pourcentageMasque: false,
        ordreTri: 9,
      },
    ];
    const input: AuditInput = {
      fiche: { ingredientsFr: `${INGREDIENTS_TEXTE}, réglisse* 3%` },
      produit: { contientReglisse: false }, // flag absent → le scan doit rattraper
      ingredients: avecReglisse,
    };
    const r = auditDeterministic(input);
    // Applicable (détecté) → pas NA ; mention non stockée → WARNING honnête.
    expect(byId(r, "5.3").statut).toBe("WARNING");
  });

  it("allergène matière non déclaré sur l'étiquette → 5.1 FAIL", () => {
    const input: AuditInput = {
      // "Aucun" = défaut d'import → ne déclare rien.
      fiche: { ingredientsFr: INGREDIENTS_TEXTE, allergenes: "Aucun" },
      produit: { allergenesMp: "oui" }, // la matière première signale un allergène
      ingredients: buildIngredients(),
    };
    const r = auditDeterministic(input);
    expect(byId(r, "5.1").statut).toBe("FAIL");
  });

  it("allergène déclaré sur la fiche → 5.1 PASS (gras manuel)", () => {
    const input: AuditInput = {
      fiche: { ingredientsFr: INGREDIENTS_TEXTE, allergenes: "Fruits à coque" },
      produit: { allergenesMp: "oui" },
      ingredients: buildIngredients(),
    };
    const r = auditDeterministic(input);
    expect(byId(r, "5.1").statut).toBe("PASS");
  });

  it("flag estCamellia → 1.1 calcule le seuil 51 %", () => {
    // Un thé majoritaire (8 kg Camellia / 8.5 kg total ≈ 94 %).
    const theBase: AuditIngredient[] = [
      {
        codeArticle: "TV100", designation: "Thé vert", quantiteKg: 8,
        pourcentageBrut: 94, pourcentageEtiquette: 94,
        estDemeter: false, estEquitable: false, estCamellia: true, pourcentageMasque: false, ordreTri: 1,
      },
      {
        codeArticle: "EF020", designation: "Menthe", quantiteKg: 0.5,
        pourcentageBrut: 6, pourcentageEtiquette: 6,
        estDemeter: false, estEquitable: false, estCamellia: false, pourcentageMasque: false, ordreTri: 2,
      },
    ];
    const input: AuditInput = {
      fiche: { ingredientsFr: "Ingrédients : thé vert* 94%, menthe* 6%" },
      produit: { typeTheFr: "Thé vert" },
      ingredients: theBase,
    };
    const r = auditDeterministic(input);
    expect(byId(r, "1.1").statut).toBe("PASS"); // ≥ 51 % Camellia
  });
});

describe("§1.3 — le nom usuel d'une infusion", () => {
  const infusion = (denominationLegale: string | null) =>
    auditDeterministic({
      fiche: { ingredientsFr: INGREDIENTS_TEXTE, allergenes: "non", denominationLegale },
      produit: { typeTheFr: "Mélange de plantes" },
      ingredients: buildIngredients(),
    }).find((c) => c.id === "1.6");

  it("accepte un nom usuel de la liste fermée du §1.3", () => {
    expect(infusion("Infusion aux plantes")?.statut).toBe("PASS");
    expect(infusion("Tisane de Noël")?.statut).toBe("PASS");
  });

  it("refuse un nom commercial — le §1 interdit qu'il tienne lieu de dénomination", () => {
    const r = infusion("Magie des bois");
    expect(r?.statut).toBe("WARNING");
    expect(r?.action).toBe("COMPLETER");
    expect(r?.justification).toContain("nom commercial");
  });

  it("demande de compléter quand la dénomination légale est vide", () => {
    expect(infusion(null)?.action).toBe("COMPLETER");
  });
});

describe("§3.2 — le nombre de tasses suit le poids net", () => {
  const tasses = (poidsNet: string | null, nbTasses: string | null) =>
    auditDeterministic({
      fiche: { ingredientsFr: INGREDIENTS_TEXTE, allergenes: "non" },
      produit: { typeTheFr: "Mélange de plantes", poidsNet, nbTasses },
      ingredients: buildIngredients(),
    }).find((c) => c.id === "6.3");

  it("valide 50 tasses pour 100 g — la dose de référence est 2 g", () => {
    expect(tasses("100 g", "50")?.statut).toBe("PASS");
  });

  it("signale une dose implicite différente, et rappelle le logo tasse", () => {
    // Deux produits du catalogue annoncent 25 tasses pour 100 g, soit 4 g.
    const r = tasses("100 g", "25");
    expect(r?.statut).toBe("WARNING");
    expect(r?.justification).toContain("4 g par tasse");
    expect(r?.justification).toContain("logo tasse");
  });

  it("ne conclut rien quand une des deux valeurs manque", () => {
    expect(tasses("100 g", null)?.action).toBe("COMPLETER");
    expect(tasses(null, "50")?.action).toBe("COMPLETER");
  });
});
