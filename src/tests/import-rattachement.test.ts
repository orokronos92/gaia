import { describe, expect, it } from "vitest";
import { lireCsv } from "@/lib/import-catalogue/csv";
import { normaliserReference, rattacher } from "@/lib/import-catalogue/rattachement";
import type { FichierTrie, ProduitReferences } from "@/lib/import-catalogue/rattachement";

describe("lireCsv", () => {
  it("reads quoted fields with semicolons, doubled quotes and line breaks", () => {
    const lignes = lireCsv('﻿a;b\r\n"x;y";"il dit ""oui""\nfin"\r\n');
    expect(lignes).toEqual([{ a: "x;y", b: 'il dit "oui"\nfin' }]);
  });
});

describe("normaliserReference", () => {
  it("drops the separators the file names add", () => {
    expect(["ETBA501V5-", "ETBA501V5 -", "etba501v5_"].map(normaliserReference)).toEqual(["ETBA501V5", "ETBA501V5", "ETBA501V5"]);
  });
});

describe("rattacher", () => {
  const produits: ProduitReferences[] = [
    { id: "p1", codePf: "TA5011", refFacing: "ETBA501V6", refContre: "ETCBA5011V6" },
    { id: "p2", codePf: "TN2255", refFacing: null, refContre: null },
    { id: "p3", codePf: "TA7372", refFacing: null, refContre: null },
    { id: "p4", codePf: "TA7376", refFacing: null, refContre: null },
  ];
  const fichier = (chemin: string, codeEtiquette: string, role: string, codePf = ""): FichierTrie => ({ chemin, codeEtiquette, version: "", role, codePf });

  it("uses the workbook reference first, then older versions, then the code, then the folder", () => {
    const { liens, nonRattaches } = rattacher([
      fichier("01\\TA501 REVE\\ETBA501V6-Reve.pdf", "ETBA501V6-", "facing"),
      fichier("01\\TA501 REVE\\ETBA501V5-Reve.pdf", "ETBA501V5-", "facing"),
      fichier("21\\PRIMEURS\\TN2255 Full Moon.pdf", "", "non precise", "TN2255"),
      fichier("05\\TA737 CHAI\\chai.pdf", "", "non precise"),
      fichier("99\\DIVERS\\inconnu.pdf", "ETZZ999V1", "facing"),
    ], produits, "P");
    expect(liens.map((l) => [l.codePf, l.methode, l.actif])).toEqual([
      ["TA5011", "reference_exacte", true],
      ["TA5011", "reference_autre_version", false],
      ["TN2255", "code_produit", true],
      ["TA7372", "dossier", true],
      ["TA7376", "dossier", true],
    ]);
    expect(nonRattaches.map((f) => f.codeEtiquette)).toEqual(["ETZZ999V1"]);
    expect(liens[0].cleS3).toBe("P/01/TA501 REVE/ETBA501V6-Reve.pdf");
  });
});
