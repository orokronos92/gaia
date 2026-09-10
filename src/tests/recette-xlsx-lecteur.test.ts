import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { lireFicheRecetteXlsx, type FicheRecetteLue } from "@/lib/recette/xlsx-lecteur";

/**
 * Ground truth for the five real JDG workbooks, established by reading each
 * file cell by cell (2026-09-10) — not by trusting what the import produced.
 *
 * These five are the whole reason the reader exists: the previous extraction
 * handed the workbook to the LLM as flattened text and let it guess the column
 * grid, which turned TA602's three fair-trade ticks into Demeter ticks. A tick
 * that moves one column is a certification claim on an ingredient that carries
 * none, so every tick below is asserted, not sampled.
 */
const DOSSIER = path.join(process.cwd(), "src/tests/fixtures/recettes");

function lire(fichier: string): FicheRecetteLue {
  const buffer = fs.readFileSync(path.join(DOSSIER, fichier));
  const fiche = lireFicheRecetteXlsx(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  );
  expect(fiche, `${fichier} doit être lu`).not.toBeNull();
  return fiche as FicheRecetteLue;
}

/** code article → [kg, % étiquette JDG, Demeter, équitable] */
type Attendu = Record<string, [number, number, boolean, boolean]>;

const CORPUS: {
  fichier: string;
  reference: string;
  onglet: string;
  version: string;
  lignes: Attendu;
}[] = [
  {
    fichier: "MT165 MATE SPORTIF.xlsx",
    reference: "ENR-PRO-023",
    onglet: "Feuil1",
    version: "V.0",
    lignes: {
      MT100: [10, 62, false, false],
      AS002: [0.6, 4, false, false],
      EF020: [0.6, 4, false, false],
      EF015: [2.5, 15.5, false, false],
      EF033: [1, 6, false, false],
      EF055: [0.3, 2, false, false],
      TF150: [1, 6, false, false],
      TF175B: [0.08, 0.5, false, false],
    },
  },
  {
    fichier: "TA602 LE SENS DE LA FETE.xlsx",
    reference: "ENR-PRO-023",
    onglet: "v.0",
    version: "V.0",
    lignes: {
      BV15: [10, 69, false, true],
      AS089: [1.2, 8, false, false],
      AS087: [0.3, 2, false, false],
      EF080: [0.7, 5, false, false],
      EF031: [0.5, 3, false, true],
      EF006M: [0.76, 5, false, true],
      EF153: [0.4, 3, false, false],
      EF001: [0.4, 3, false, false],
      EF026: [0.2, 1, false, false],
      EF017: [0.03, 0.5, false, false],
      EF024: [0.08, 0.5, false, false],
    },
  },
  {
    fichier: "TA626 LE SOUFFLE DES MERS.xlsx",
    reference: "ENR-PRO-023",
    onglet: "Feuil1",
    version: "V.0",
    lignes: {
      TV429: [7, 58, false, true],
      TH260B: [0.5, 4, false, false],
      EF134: [0.4, 3, false, false],
      EF146: [2.5, 20, false, false],
      AS083: [0.45, 4, false, false],
      AS090: [0.7, 6, false, false],
      EF031: [0.56, 5, false, false],
    },
  },
  {
    fichier: "TA737 MALIN COMME UN CHIMPANZE(1).xlsx",
    reference: "ENR-PRO-024",
    onglet: "v.2",
    version: "V.2",
    lignes: {
      HB170: [5, 32, false, false],
      TN592: [6, 38, false, true],
      AS076: [0.64, 4, false, false],
      AS066: [0.72, 5, false, false],
      EF060: [0.14, 1, false, false],
      EF231: [3, 19, false, false],
      EF024: [0.1, 1, false, false],
    },
  },
  {
    fichier: "TA746 L'ODYSSEE.xlsx",
    reference: "ENR-PRO-023",
    onglet: "Feuil1",
    version: "V.0",
    lignes: {
      TN551: [9, 65, false, true],
      EF011: [0.8, 6, false, false],
      AS081: [0.34, 3, false, false],
      AS082: [0.3, 2, false, false],
      AS063: [0.86, 6, false, false],
      EF262: [2.4, 17, false, false],
      EF191: [0.14, 1, false, false],
    },
  },
];

describe.each(CORPUS)("fiche recette $fichier", (cas) => {
  const fiche = lire(cas.fichier);
  const attendus = Object.entries(cas.lignes);

  it("identifie le formulaire, l'onglet et la version en vigueur", () => {
    expect(fiche.reference).toBe(cas.reference);
    expect(fiche.tableau.onglet).toBe(cas.onglet);
    expect(fiche.versionRetenue).toBe(cas.version);
  });

  it("lit exactement les lignes de la recette, sans en inventer ni en perdre", () => {
    expect(fiche.tableau.lignes.map((l) => l.codeArticle)).toEqual(
      attendus.map(([code]) => code)
    );
  });

  it.each(attendus)("%s : kg, %% étiquette et coches", (code, [kg, pct, demeter, equitable]) => {
    const ligne = fiche.tableau.lignes.find((l) => l.codeArticle === code);
    expect(ligne, `${code} doit être présent`).toBeDefined();
    expect(ligne?.quantiteKg).toBeCloseTo(kg, 6);
    expect(ligne?.pourcentageEtiquetteSource).toBeCloseTo(pct, 6);
    expect(ligne?.estDemeter).toBe(demeter);
    expect(ligne?.estEquitable).toBe(equitable);
  });

  it("retrouve le total kg imprimé sur la fiche", () => {
    const somme = fiche.tableau.lignes.reduce((s, l) => s + (l.quantiteKg ?? 0), 0);
    expect(fiche.tableau.totalKgSource).toBeCloseTo(somme, 6);
  });
});

describe("garde-fous du corpus", () => {
  it("aucune matière Demeter dans les cinq classeurs — la colonne C est vide partout", () => {
    for (const cas of CORPUS) {
      const fiche = lire(cas.fichier);
      expect(
        fiche.tousTableaux.flatMap((t) => t.lignes).filter((l) => l.estDemeter),
        `${cas.fichier} ne déclare aucun ingrédient Demeter`
      ).toEqual([]);
    }
  });

  it("TA602 : les trois coches sont équitables, jamais Demeter (régression du 08/09)", () => {
    const fiche = lire("TA602 LE SENS DE LA FETE.xlsx");
    expect(fiche.tableau.lignes.filter((l) => l.estEquitable).map((l) => l.codeArticle)).toEqual([
      "BV15",
      "EF031",
      "EF006M",
    ]);
    expect(fiche.tableau.lignes.some((l) => l.estDemeter)).toBe(false);
  });

  it("TA737 : la fiche de modification retient la nouvelle version, pas celle en cours", () => {
    const fiche = lire("TA737 MALIN COMME UN CHIMPANZE(1).xlsx");
    expect(fiche.tableau.intitule).toBe("VERSION NOUVELLE RECETTE : V.2");
    expect(fiche.tableau.estNouvelleVersion).toBe(true);
    // TN407B n'existe que dans la V.1 : le retrouver signalerait le mauvais tableau.
    expect(fiche.tableau.lignes.map((l) => l.codeArticle)).not.toContain("TN407B");
    expect(fiche.entete.descriptifModification).toBe(
      "modification de la base de thé (fin du stock à écouler TN407B)"
    );
  });

  it("TA737 : les cases à cocher Excel sont lues, et « incidence étiquetage » est non renseignée", () => {
    const fiche = lire("TA737 MALIN COMME UN CHIMPANZE(1).xlsx");
    expect(fiche.cases).toHaveLength(12);
    // Seule « MODIFICATION PERMANENTE » est cochée, une fois par onglet de modification.
    expect(fiche.cases.filter((c) => c.cochee).map((c) => c.ancre)).toEqual(["A5", "A5"]);
    // Ni ETIQUETAGE ni DLUO n'est coché : la fiche ne répond pas — ce n'est pas « non ».
    expect(fiche.incidenceEtiquetage).toBeNull();
  });

  it("signale les recettes que la R&D déclare non finalisées", () => {
    for (const fichier of ["TA626 LE SOUFFLE DES MERS.xlsx", "TA746 L'ODYSSEE.xlsx"]) {
      expect(lire(fichier).anomalies.join(" ")).toContain("non finalisée");
    }
    expect(lire("MT165 MATE SPORTIF.xlsx").anomalies).toEqual([]);
  });
});
