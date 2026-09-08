import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { analyserBat, hauteurXmm, surfaceFaceLaPlusGrande } from "../lib/utils/pdf-bat";
import { extractPdfText } from "../lib/utils/pdf-text";

/**
 * Le BAT sert de témoin : c'est un artwork du client, il reste sur le serveur et
 * n'est pas versionné. Les tests se désactivent proprement s'il est absent —
 * mieux vaut une suite honnêtement incomplète qu'un fichier client sur GitHub.
 */
const CHEMIN = join(__dirname, "fixtures", "bat-ta7372-contre.pdf");
const disponible = existsSync(CHEMIN);
const siPresent = disponible ? describe : describe.skip;
const BAT = disponible ? readFileSync(CHEMIN) : Buffer.alloc(0);

siPresent("lecture d'un BAT — TA7372 contre-étiquette", () => {
  it("lit la zone de coupe, pas le support avec fond perdu", async () => {
    const a = await analyserBat(BAT);
    // Le support fait 221,9 × 335,3 pts ; la face finie 55 × 95 mm.
    expect(a.pages[0].coupe).toEqual({ largeurMm: 55, hauteurMm: 95, surfaceCm2: 52.25 });
  });

  it("lit les métriques des neuf polices embarquées", async () => {
    const a = await analyserBat(BAT);
    expect(Object.keys(a.polices)).toHaveLength(9);
    // XHeight est déclarée par le PDF : la hauteur de x n'est pas une estimation.
    expect(a.polices["MrEavesXLSanOT-Reg"].xHeight).toBe(432);
    expect(a.polices["JardinsGaia-Script"].xHeight).toBe(378);
  });

  it("ne perd plus le M de « Malin » — le défaut venait de pdf2json", async () => {
    const a = await analyserBat(BAT);
    expect(a.pages[0].mots.some((m) => m.texte === "Malin")).toBe(true);
    expect(a.texte).toContain("Malin");
  });

  it("rend le corps EXACT, pas l'arrondi d'un convertisseur", async () => {
    const a = await analyserBat(BAT);
    const poids = a.pages[0].mots.find((m) => m.texte === "100g");
    // pdftohtml annonce 23 à son zoom par défaut ; le flux de contenu dit 15.
    expect(poids?.corpsPt).toBe(15);
    expect(poids?.police).toBe("MrEavesModOT-Reg");
  });

  it("mesure la hauteur de x de la liste d'ingrédients", async () => {
    const a = await analyserBat(BAT);
    const mot = a.pages[0].mots.find((m) => m.texte === "honeybush*,");
    expect(mot?.corpsPt).toBe(7);
    const metrique = a.polices[mot!.police!];
    // 432/1000 × 7 pt × 0,3528 mm/pt = 1,067 mm — seuil §12 : 0,9 mm.
    expect(hauteurXmm(mot!.corpsPt!, metrique)).toBeCloseTo(1.067, 3);
  });

  it("rattache un style à la grande majorité des mots", async () => {
    const a = await analyserBat(BAT);
    const mots = a.pages[0].mots;
    const avecCorps = mots.filter((m) => m.corpsPt !== null).length;
    // Les manquants sont des mots isolés de texte décoratif, jamais des
    // mentions obligatoires — celles-ci sont toutes couvertes.
    expect(avecCorps / mots.length).toBeGreaterThan(0.75);
  });

  it("retient la face la plus grande — c'est elle qui fixe le seuil §12", () => {
    expect(
      surfaceFaceLaPlusGrande([
        { pages: [{ largeurPt: 0, hauteurPt: 0, coupe: { largeurMm: 55, hauteurMm: 95, surfaceCm2: 52.25 }, mots: [] }], polices: {}, texte: "" },
        { pages: [{ largeurPt: 0, hauteurPt: 0, coupe: { largeurMm: 55, hauteurMm: 135, surfaceCm2: 74.25 }, mots: [] }], polices: {}, texte: "" },
      ])
    ).toBe(74.25);
  });
});

siPresent("extraction texte — remplacement de pdf2json", () => {
  it("rend le texte complet, accents compris", async () => {
    const texte = await extractPdfText(BAT);
    expect(texte).toContain("Malin comme un chimpanzé");
    expect(texte).toContain("INGRÉDIENTS");
    // La mention Eurofeuille est sur le facing, pas sur la contre-étiquette.
    expect(texte).toContain("agriculture biologique");
  });
});
