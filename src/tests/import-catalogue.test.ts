import { describe, expect, it } from "vitest";
import { ancetreDepuisSeed } from "@/lib/import-catalogue/ancetre-seed";
import { ColonneManquanteError, indexerColonnes } from "@/lib/import-catalogue/cellules";
import { deciderChamp } from "@/lib/import-catalogue/fusion";
import { creerResolveurGammes } from "@/lib/import-catalogue/gammes";
import { COLONNES_JDG, indexerJdg, lireLigneJdg } from "@/lib/import-catalogue/ligne-jdg";
import type { Cellule } from "@/lib/import-catalogue/cellules";
import { construirePlan, DATE_SEED } from "@/lib/import-catalogue/plan";
import type { EtatCatalogue, FicheExistante, ProduitExistant } from "@/lib/import-catalogue/plan";

describe("deciderChamp — three-way merge", () => {
  it("takes the workbook when only the workbook changed", () => {
    expect(deciderChamp("thé noir", "thé noir", "thé noir*")).toBe("prendre");
  });
  it("keeps Marie's edit when the workbook did not change", () => {
    expect(deciderChamp("thé noir", "thé noir bio", "thé noir")).toBe("garder");
  });
  it("flags a conflict when both changed differently", () => {
    expect(deciderChamp("a", "b", "c")).toBe("conflit");
  });
  it("never erases an app value with an empty cell", () => {
    expect(deciderChamp("a", "a", null)).toBe("vide_excel");
  });
  it("without ancestor, fills an empty base and flags any other difference", () => {
    expect(deciderChamp(undefined, null, "x")).toBe("prendre");
    expect(deciderChamp(undefined, "y", "x")).toBe("conflit");
  });
  it("compares content, not spelling: CRLF, spaces, array order", () => {
    expect(deciderChamp("a", "a\r\nb ", "a\nb")).toBe("identique");
    expect(deciderChamp(null, ["WFTO", "AB"], ["AB", "WFTO"])).toBe("identique");
  });
});

describe("indexerColonnes", () => {
  it("matches headers exactly after normalising spaces and case", () => {
    expect(indexerColonnes(["Code  PF", "NOUVEAU TEXTE\r\nCOMMERCIAL"], ["CODE PF", "NOUVEAU TEXTE COMMERCIAL"])).toEqual({
      "CODE PF": 0,
      "NOUVEAU TEXTE COMMERCIAL": 1,
    });
  });
  it("refuses to guess a missing column", () => {
    expect(() => indexerColonnes(["1-4 Nouveau texte commercial FR"], ["NOUVEAU TEXTE COMMERCIAL FR"])).toThrow(ColonneManquanteError);
  });
});

const ENTETES: Cellule[] = [...COLONNES_JDG];
function ligne(valeurs: Partial<Record<(typeof COLONNES_JDG)[number], Cellule>>): Cellule[] {
  return COLONNES_JDG.map((c) => valeurs[c] ?? "");
}
const BASE_LIGNE = {
  "CODE PF": "TA7091", GAMME: "Les grands classiques", "DÉNOMINATION FR": "À l'ombre des amandiers",
  "TYPE DE THÉ FR": "Thé noir aromatisé", "PLUSIEURS INFUSIONS": "/", "PHRASE WFTO FR": "/",
  AB: "AB", WFTO: "WFTO", D: "/", IGP: "Médaille d'or", "REF FACING 2025": "INTERNE", "RÉF CONTRE 2025": "ETCVA6692V6",
} as const;

describe("lireLigneJdg", () => {
  const lu = lireLigneJdg(ligne(BASE_LIGNE), indexerJdg(ENTETES), 3);
  it("reads a row into product and label-sheet fields", () => {
    expect(lu.ok).toBe(true);
    if (!lu.ok) return;
    expect(lu.ligne.produit.labelsClient).toEqual(["AB", "WFTO"]);
    expect(lu.ligne.produit.plusieursInfusions).toBe(false);
    expect(lu.ligne.fiche).toMatchObject({ statutWfto: "NON", phraseWftoFr: null, refFacing: null, refContre: "ETCVA6692V6", codeEtiquette: "ETCVA6692V6" });
  });
  it("reports label cells that are not the label", () => {
    expect(lu.ok && lu.ligne.anomalies.map((a) => a.colonne)).toContain("IGP");
  });
});

describe("ancetreDepuisSeed", () => {
  it("reproduces the seed's substring lookup, quirks included", () => {
    const lu = ancetreDepuisSeed({ "CODE PF": "TA7091", "DÉNOMINATION FR": "X", "PLUSIEURS INFUSIONS ": "/", "1-4 Nouveau texte commercial FR": "début" });
    expect(lu?.ancetre.produit.plusieursInfusions).toBe(true);
    expect(lu?.ancetre.fiche.texteCommercialFr).toBe("début");
  });
});

describe("construirePlan", () => {
  const resoudre = creerResolveurGammes(
    [{ id: "g1", nom: "LES GRANDS CLASSIQUES" }, { id: "g2", nom: "LES ENGAGÉS" }, { id: "g3", nom: "Les Engagés" }],
    [],
  );
  const index = indexerJdg(ENTETES);
  const lire = (v: Partial<Record<(typeof COLONNES_JDG)[number], Cellule>>, n: number) => lireLigneJdg(ligne({ ...BASE_LIGNE, ...v }), index, n);
  const produitBase = (codePf: string, archive = false): ProduitExistant => {
    const lu = lire({ "CODE PF": codePf }, 0);
    if (!lu.ok) throw new Error("fixture");
    return { ...lu.ligne.produit, id: `p-${codePf}`, codePf, archive, creeLe: DATE_SEED, gammeId: "g1", sousGammeId: null };
  };

  it("creates, compares, and sets aside duplicates, archived codes and ambiguous ranges", () => {
    const existant = produitBase("TA7092");
    const fiche: FicheExistante = { ...(lire({}, 0) as { ok: true; ligne: { fiche: FicheExistante } }).ligne.fiche, id: "f1", produitId: existant.id, codeEtiquette: null };
    const etat: EtatCatalogue = { produits: [existant, produitBase("TA7093", true)], fiches: [fiche] };
    const plan = construirePlan(
      [lire({}, 2), lire({ "CODE PF": "TA7092", "RÉF CONTRE 2025": "ETCVA7092V6" }, 3), lire({ "CODE PF": "TA7093" }, 4),
        lire({ "CODE PF": "TA7094" }, 5), lire({ "CODE PF": "TA7094", "DÉNOMINATION FR": "Autre" }, 6), lire({ "CODE PF": "TA7095", GAMME: "Les Engagés" }, 7)],
      new Map(), etat, resoudre,
    );
    expect(plan.creations.map((c) => c.codePf)).toEqual(["TA7091"]);
    expect(plan.misesAJour.map((m) => m.codePf)).toEqual(["TA7092"]);
    expect(plan.misDeCote.map((m) => m.codePf).sort()).toEqual(["TA7093", "TA7094"]);
    expect(plan.libellesInconnus).toEqual([expect.objectContaining({ libelle: "Les Engagés", motif: "ambiguë", lignes: 1 })]);
  });

  it("does not write a label code two products would share", () => {
    const plan = construirePlan([lire({}, 2), lire({ "CODE PF": "TA7092" }, 3)], new Map(), { produits: [], fiches: [] }, resoudre);
    expect(plan.creations.every((c) => c.fiche.codeEtiquette === null)).toBe(true);
    expect(plan.anomalies.filter((a) => a.colonne === "code étiquette")).toHaveLength(2);
  });
});
