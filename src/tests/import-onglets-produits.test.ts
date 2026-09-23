import { describe, expect, it } from "vitest";
import { INFUSETTES_PAGES, TERRA_MADRE } from "@/lib/import-catalogue/cartes-onglets";
import type { Cellule } from "@/lib/import-catalogue/cellules";
import { indexerOnglet, lireLigneOnglet } from "@/lib/import-catalogue/onglets-produits";
import type { CarteOnglet } from "@/lib/import-catalogue/onglets-produits";

/** Every column the map names, filled from `valeurs`, empty otherwise. */
function feuille(carte: CarteOnglet, valeurs: Record<string, Cellule>) {
  const entetes = [...new Set(["CODE PF", carte.phraseWfto, ...carte.labels, ...Object.values(carte.produit), ...Object.values(carte.fiche),
    ...[carte.extrasProduit, carte.extrasFiche, carte.suivi].flatMap((e) => Object.values(e).map(([c]) => c)),
    ...("colonne" in carte.gamme ? [carte.gamme.colonne] : []), ...(typeof carte.typeThe === "object" ? [carte.typeThe.colonne] : []),
    ...(carte.refFacing ? [carte.refFacing] : []), ...(carte.refContre ? [carte.refContre] : [])])];
  return { index: indexerOnglet(carte, entetes), ligne: entetes.map((e) => valeurs[e] ?? "") };
}

describe("lireLigneOnglet", () => {
  it("reads a Terra Madre row: range as type, AOP kept, Terra Madre reference", () => {
    const { index, ligne } = feuille(TERRA_MADRE, {
      "CODE PF": "AR00178", GAMME: "MY FRENCH RUBS", "DÉNOMINATION PRINCIPALE": "Frétillant, le poisson !", AB: "AB", IGP: "AOP",
      "RÉF ÉTIQ FACING": "ET00701", "RÉF ÉTIQ CONTRE": "/", "PHRASE WFTO FR": "/", "PACK.": "EMB0030 EMB0031", ACTION: "Great Taste 2017",
    });
    const lu = lireLigneOnglet(TERRA_MADRE, ligne, index, 2);
    expect(lu.resultat.ok).toBe(true);
    if (!lu.resultat.ok) return;
    expect(lu.resultat.ligne.produit).toMatchObject({ typeTheFr: "MY FRENCH RUBS", labelsClient: ["AB", "AOP"] });
    expect(lu.resultat.ligne.fiche).toMatchObject({ refFacing: "ET00701", refContre: null, codeEtiquette: "ET00701", statutWfto: "NON" });
    expect(lu.extras.produit).toEqual({ emballage: "EMB0030 EMB0031", distinctions: "Great Taste 2017" });
  });

  it("reads an infusette row into the fixed range and its yes/no mentions", () => {
    const { index, ligne } = feuille(INFUSETTES_PAGES, {
      "CODE PF": "IF150", "DÉNOMINATION FR": "Thé blanc litchi rose", "TYPE DE THÉ FR": "Thé blanc aromatisé",
      "PAVÉ INFO TRI + TRIMAN": "OUI", "LABEL FSC": "NON", IMPRIMEUR: "PAGES", "ENVOI A L'IMPRIMEUR": 45401,
    });
    const lu = lireLigneOnglet(INFUSETTES_PAGES, ligne, index, 2);
    expect(lu.resultat.ok && lu.resultat.ligne.gamme).toBe("INFUSETTES");
    expect(lu.extras.fiche).toMatchObject({ paveInfoTri: true, labelFsc: false });
    expect(lu.extras.suivi).toEqual({ imprimeur: "PAGES", dateEnvoiImprimeur: "2024-04-19" });
  });
});
