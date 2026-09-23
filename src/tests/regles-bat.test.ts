import { describe, expect, it } from "vitest";
import { lireCodeFichier, verifierCompatibilite, versionsDepassees } from "@/lib/conditionnement/regles-bat";

const CHE_CHUN = {
  "1,5 kg": { codePf: "TB4041", refFacing: null, refContre: null },
  "100 g": { codePf: "TB4042", refFacing: "ETBN4042V6", refContre: "ETCBN4042V6" },
  "50 g": { codePf: "TB4046", refFacing: "ETBN404V6", refContre: "ETCBN4046V6" },
};
const FICHIERS = ["ETBN4042V6 Ché Chun_Volumineux.pdf", "ETCBN4042V6 Ché Chun_Volumineux.pdf", "ETBN404V6 Ché Chun.pdf", "ETCBN4046V6 Ché Chun.pdf"];
const acceptes = (produit: (typeof CHE_CHUN)[keyof typeof CHE_CHUN]) => FICHIERS.filter((f) => verifierCompatibilite(produit, f).ok);

describe("lireCodeFichier", () => {
  it("reads face, article, format digit and version", () => {
    expect(lireCodeFichier("ETCBN4046V6 Ché Chun.pdf")).toEqual({ base: "ETCBN4046", contre: true, numero: "404", chiffre: "6", version: 6 });
    expect(lireCodeFichier("ETBN404V6 Ché Chun.pdf")).toMatchObject({ contre: false, chiffre: null });
    expect(lireCodeFichier("TN5502 Black Evidence 2025.pdf")).toBeNull();
  });
});

describe("verifierCompatibilite — Ché Chun", () => {
  it("gives the bulk bag no BAT", () => expect(acceptes(CHE_CHUN["1,5 kg"])).toEqual([]));
  it("gives the 100 g its two labels only", () => expect(acceptes(CHE_CHUN["100 g"])).toEqual(FICHIERS.slice(0, 2)));
  it("gives the 50 g its two labels only", () => expect(acceptes(CHE_CHUN["50 g"])).toEqual(FICHIERS.slice(2)));
  it("falls back to the digit when the workbook names no reference", () => {
    const sansReference = { codePf: "TB4046", refFacing: null, refContre: null };
    expect(verifierCompatibilite(sansReference, "ETCBN4042V6 x.pdf")).toMatchObject({ ok: false });
    expect(verifierCompatibilite(sansReference, "ETBN404V6 x.pdf")).toEqual({ ok: true });
  });
});

describe("versionsDepassees", () => {
  const lien = (id: string, nomFichier: string, dossier = "ÉTIQUETTES 2026-09/x/") => ({ id, produitId: "p", cleS3: dossier + nomFichier, nomFichier });
  it("keeps the latest vintage of a Grand Cru, coded or not", () => {
    const d = versionsDepassees([lien("a", "ETNN550V5 BLACK EVIDENCE 2026.pdf"), lien("b", "TN5502 Black Evidence 2025.pdf"), lien("c", "TN5502_Black Evidence 2025.pdf")]);
    expect([...d.keys()].sort()).toEqual(["b", "c"]);
  });
  it("drops every extra copy of each name in one pass, whichever file is kept", () => {
    const d = versionsDepassees([lien("a1", "IF111 JASMIN.pdf"), lien("b1", "IF111 - JASMIN.pdf"), lien("a2", "IF111 JASMIN.pdf", "ÉTIQUETTES 2026-09/archive/"), lien("b2", "IF111 - JASMIN.pdf", "ÉTIQUETTES 2026-09/archive/")]);
    expect(d.size).toBe(2);
    expect(versionsDepassees([lien("a1", "IF111 JASMIN.pdf"), lien("b1", "IF111 - JASMIN.pdf")].filter((l) => !d.has(l.id))).size).toBe(0);
  });

  it("keeps the highest version and the September copy of the same file", () => {
    const d = versionsDepassees([lien("v5", "ETCBA5016V5-x.pdf"), lien("v6", "ETCBA5016V6-x.pdf"), lien("mars", "ETCBA5016V6-x.pdf", "RÉFÉRENCES ÉTIQUETTES/x/")]);
    expect([...d.keys()].sort()).toEqual(["mars", "v5"]);
  });
});
