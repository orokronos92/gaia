import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { mesurerEurofeuille } from "../lib/audit/visual/eurofeuille";
import { analyserBat } from "../lib/utils/pdf-bat";
import {
  elargir,
  lireRepere,
  rectDepuisMot,
  rectDepuisTrace,
  rendreFace,
  type RectPx,
} from "../lib/utils/pdf-repere";

const recto = join(__dirname, "fixtures", "bat-ta7372-recto.pdf");
const verso = join(__dirname, "fixtures", "bat-ta7372-contre.pdf");
const siPresent = existsSync(recto) && existsSync(verso) ? describe : describe.skip;

/** Moyenne RGB d'un rendu PPM brut (P6) — lisible sans bibliothèque. */
function couleurMoyenne(ppm: Buffer): { r: number; v: number; b: number; pixels: number } {
  // En-tête : "P6\n<largeur> <hauteur>\n<max>\n", champs séparés par des blancs.
  let i = 0;
  let champs = 0;
  while (champs < 4 && i < ppm.length) {
    while (i < ppm.length && /\s/.test(String.fromCharCode(ppm[i]))) i++;
    while (i < ppm.length && !/\s/.test(String.fromCharCode(ppm[i]))) i++;
    champs++;
  }
  i++; // le blanc unique qui suit la valeur maximale

  let r = 0, v = 0, b = 0, n = 0;
  for (let p = i; p + 2 < ppm.length; p += 3) {
    r += ppm[p]; v += ppm[p + 1]; b += ppm[p + 2]; n++;
  }
  return n === 0 ? { r: 0, v: 0, b: 0, pixels: 0 } : { r: r / n, v: v / n, b: b / n, pixels: n };
}

/**
 * Écart-type de la luminance d'un rendu.
 *
 * On ne mesure pas la noirceur : la contre-étiquette des Jardins de Gaïa est
 * imprimée en texte **clair sur fond sombre**, où « part d'encre » ne veut rien
 * dire — un aplat foncé y est plus sombre qu'un mot. Le contraste, lui, ne
 * dépend pas de la polarité : du texte varie, un aplat non.
 */
function ecartTypeLuminance(ppm: Buffer): number {
  let i = 0;
  let champs = 0;
  while (champs < 4 && i < ppm.length) {
    while (i < ppm.length && /\s/.test(String.fromCharCode(ppm[i]))) i++;
    while (i < ppm.length && !/\s/.test(String.fromCharCode(ppm[i]))) i++;
    champs++;
  }
  i++;

  const valeurs: number[] = [];
  for (let p = i; p + 2 < ppm.length; p += 3) {
    valeurs.push((ppm[p] + ppm[p + 1] + ppm[p + 2]) / 3);
  }
  if (valeurs.length === 0) return -1;
  const moyenne = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
  return Math.sqrt(valeurs.reduce((a, b) => a + (b - moyenne) ** 2, 0) / valeurs.length);
}

siPresent("pont de coordonnées — TA7372", () => {
  const RECTO = readFileSync(recto);
  const VERSO = readFileSync(verso);

  it("lit la boîte de rognage, celle que poppler rend", async () => {
    const r = await lireRepere(RECTO, 1, 150);
    expect(r.x0).toBe(0);
    expect(Number((r.x1 - r.x0).toFixed(1))).toBe(221.9);
    expect(Number((r.y1 - r.y0).toFixed(1))).toBe(448.7);
    // 221,906 pt × 150/72 = 462 px.
    expect(r.largeurPx).toBe(462);
    expect(r.hauteurPx).toBe(935);
  });

  it("cadre l'Eurofeuille au bon endroit — le rendu y est vert", async () => {
    // La preuve ne repose pas sur l'arithmétique : on rend le rectangle calculé
    // et on regarde. Le champ de l'Eurofeuille est vert, rien d'autre ne l'est
    // à cet endroit de l'étiquette.
    const analyse = await analyserBat(RECTO);
    const logo = mesurerEurofeuille(analyse.traces);
    expect(logo).not.toBeNull();

    const repere = await lireRepere(RECTO, 1, 150);
    const rect = rectDepuisTrace(
      { ...logo!, sousTraces: 0, droites: 0, courbes: 0, rectangles: 0 },
      repere
    );
    const ppm = await rendreFace(RECTO, { dpi: 150, region: rect, format: "ppm" });
    const { r, v, b, pixels } = couleurMoyenne(ppm);

    expect(pixels).toBeGreaterThan(100);
    expect(v).toBeGreaterThan(r + 20);
    expect(v).toBeGreaterThan(b + 20);
  });

  it("cadre les mots au bon endroit — quatre mots, quatre coins, du texte partout", async () => {
    // Ce que le test prouve : les rectangles calculés tombent sur du contenu
    // imprimé et non sur le fond perdu, qui est parfaitement uniforme (0,0
    // d'écart-type). Un décalage systématique d'origine, d'échelle ou d'axe
    // ferait sortir au moins un des quatre mots de sa zone de texte.
    const analyse = await analyserBat(VERSO);
    const repere = await lireRepere(VERSO, 1, 150);

    const contraste = async (rect: RectPx) =>
      ecartTypeLuminance(await rendreFace(VERSO, { dpi: 150, region: rect, format: "ppm" }));

    // Témoin : un coin de fond perdu, sans aucun contenu.
    expect(await contraste({ x: 0, y: 0, largeur: 30, hauteur: 60 })).toBeLessThan(1);

    for (const texte of ["100g", "poids", "INGRÉDIENTS", "ETCNA7372V5"]) {
      const mot = analyse.pages[0].mots.find((m) => m.texte === texte);
      expect(mot, `mot « ${texte} » introuvable`).toBeDefined();
      expect(await contraste(rectDepuisMot(mot!, repere))).toBeGreaterThan(15);
    }
  });

  it("élargit sans jamais sortir de la face", async () => {
    const repere = await lireRepere(RECTO, 1, 150);
    const colle: RectPx = { x: 2, y: 2, largeur: 10, hauteur: 10 };
    const large = elargir(colle, 50, repere);
    expect(large.x).toBe(0);
    expect(large.y).toBe(0);
    expect(large.x + large.largeur).toBeLessThanOrEqual(repere.largeurPx);
    expect(large.y + large.hauteur).toBeLessThanOrEqual(repere.hauteurPx);
  });
});
