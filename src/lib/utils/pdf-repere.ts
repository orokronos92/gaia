/**
 * Le pont entre les trois repères d'un BAT.
 *
 * Montrer à Marie *où* se trouve la réponse sur l'étiquette suppose de convertir
 * des coordonnées entre trois systèmes qui ne s'accordent sur rien :
 *
 *   | source                    | origine        | axe Y  | unité  |
 *   |---------------------------|----------------|--------|--------|
 *   | `pdftotext -bbox` (mots)  | haut-gauche    | ↓      | points |
 *   | flux de contenu (tracés)  | espace usager  | ↑      | points |
 *   | rendu `pdftoppm`          | haut-gauche    | ↓      | pixels |
 *
 * Se tromper d'un seul de ces trois décalages donne un surlignage plausible mais
 * faux — le pire des cas, puisque personne ne le remarque. C'est exactement la
 * classe d'erreur qui a coûté le contrôle 8.1 : deux repères mélangés, un
 * verdict inversé. La conversion vit donc **ici et nulle part ailleurs**, et
 * elle est vérifiée en rendant la région calculée pour regarder ce qu'il y a
 * dedans.
 *
 * Le point d'accord : poppler rend et mesure la **boîte de rognage** (CropBox,
 * à défaut MediaBox). C'est elle le repère commun, pas la page, pas le fond
 * perdu, pas la zone de coupe.
 *
 * ⚠️ Réserve assumée : sur tous les BAT des Jardins de Gaïa, CropBox et
 * MediaBox coïncident et commencent à l'origine. Le décalage d'origine est donc
 * écrit et raisonné, mais **aucun témoin de test ne l'exerce** — un BAT dont la
 * boîte de rognage ne partirait pas de zéro validerait ou infirmerait cette
 * branche. C'est le seul angle mort connu du module.
 */

import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

import type { MotBat } from "./pdf-bat";
import type { TraceVectoriel } from "./pdf-vecteurs";

const executer = promisify(execFile);

/** Résolution de rendu par défaut : net à l'écran jusqu'à 4× sans peser. */
export const DPI_DEFAUT = 200;

export interface RepereFace {
  /** Boîte de rognage en points — celle que poppler mesure ET rend. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  dpi: number;
  /** Points → pixels. */
  echelle: number;
  largeurPx: number;
  hauteurPx: number;
}

export interface RectPx {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

/** Écrit le PDF dans un dossier temporaire et exécute une commande poppler. */
async function avecFichier<T>(
  pdf: Buffer,
  travail: (chemin: string) => Promise<T>
): Promise<T> {
  const dossier = await mkdtemp(join(tmpdir(), "repere-"));
  const chemin = join(dossier, "face.pdf");
  try {
    await writeFile(chemin, pdf);
    return await travail(chemin);
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

/**
 * Le repère d'une face, à une résolution donnée.
 *
 * On lit la CropBox et non la page : un BAT dont la boîte de rognage ne commence
 * pas à l'origine décalerait tous les surlignages, silencieusement.
 */
export async function lireRepere(
  pdf: Buffer,
  page = 1,
  dpi: number = DPI_DEFAUT
): Promise<RepereFace> {
  return avecFichier(pdf, async (chemin) => {
    const { stdout } = await executer("pdfinfo", [
      "-box", "-f", String(page), "-l", String(page), chemin,
    ]);
    const lire = (nom: string) =>
      new RegExp(`${nom}:\\s+([\\d.-]+)\\s+([\\d.-]+)\\s+([\\d.-]+)\\s+([\\d.-]+)`).exec(stdout);

    const boite = lire("CropBox") ?? lire("MediaBox");
    if (!boite) throw new Error("Boîte de rognage introuvable — PDF illisible.");

    const [x0, y0, x1, y1] = boite.slice(1, 5).map(Number);
    const echelle = dpi / 72;
    return {
      x0, y0, x1, y1, dpi, echelle,
      largeurPx: Math.round((x1 - x0) * echelle),
      hauteurPx: Math.round((y1 - y0) * echelle),
    };
  });
}

/**
 * Un mot de `pdftotext -bbox` en pixels du rendu.
 * Poppler compte déjà depuis le haut de la boîte de rognage : seule l'échelle
 * change.
 */
export function rectDepuisMot(mot: MotBat, r: RepereFace): RectPx {
  return {
    x: Math.round(mot.x * r.echelle),
    y: Math.round(mot.y * r.echelle),
    largeur: Math.max(1, Math.round(mot.largeur * r.echelle)),
    hauteur: Math.max(1, Math.round(mot.hauteur * r.echelle)),
  };
}

/**
 * Un tracé du flux de contenu en pixels du rendu.
 *
 * Deux corrections ici, et c'est tout l'intérêt du module : l'origine de
 * l'espace usager n'est pas celle de la boîte de rognage, et l'axe Y est
 * inversé. Le haut du rectangle est donc le `y1` du tracé, pas son `y0`.
 */
export function rectDepuisTrace(trace: TraceVectoriel, r: RepereFace): RectPx {
  return {
    x: Math.round((trace.x0 - r.x0) * r.echelle),
    y: Math.round((r.y1 - trace.y1) * r.echelle),
    largeur: Math.max(1, Math.round((trace.x1 - trace.x0) * r.echelle)),
    hauteur: Math.max(1, Math.round((trace.y1 - trace.y0) * r.echelle)),
  };
}

/** Une boîte quelconque en points, repère bas-gauche, vers les pixels du rendu. */
export function rectDepuisBoitePdf(
  boite: { x0: number; y0: number; x1: number; y1: number },
  r: RepereFace
): RectPx {
  return rectDepuisTrace(
    { ...boite, sousTraces: 0, droites: 0, courbes: 0, rectangles: 0 },
    r
  );
}

/** Élargit un rectangle d'une marge en pixels, sans sortir de la face. */
export function elargir(rect: RectPx, marge: number, r: RepereFace): RectPx {
  const x = Math.max(0, rect.x - marge);
  const y = Math.max(0, rect.y - marge);
  return {
    x,
    y,
    largeur: Math.min(r.largeurPx - x, rect.largeur + 2 * marge),
    hauteur: Math.min(r.hauteurPx - y, rect.hauteur + 2 * marge),
  };
}

/**
 * Rend une face, entière ou par région.
 *
 * `ppm` sert aux vérifications : c'est du RGB brut, lisible sans bibliothèque,
 * donc un test peut regarder ce qu'il y a réellement à l'endroit calculé plutôt
 * que de faire confiance à l'arithmétique.
 */
export async function rendreFace(
  pdf: Buffer,
  options: { page?: number; dpi?: number; region?: RectPx; format?: "png" | "ppm" } = {}
): Promise<Buffer> {
  const { page = 1, dpi = DPI_DEFAUT, region, format = "png" } = options;

  // `pdftoppm` de poppler n'écrit pas sur la sortie standard : il produit
  // toujours un fichier. `-singlefile` lui retire le suffixe de page, ce qui
  // rend le nom prévisible au lieu de deviner sa largeur de numérotation.
  return avecFichier(pdf, async (chemin) => {
    const prefixe = join(chemin, "..", "rendu");
    const args = [
      "-r", String(dpi),
      "-f", String(page), "-l", String(page),
      "-singlefile",
      ...(format === "png" ? ["-png"] : []),
      ...(region
        ? ["-x", String(region.x), "-y", String(region.y),
           "-W", String(region.largeur), "-H", String(region.hauteur)]
        : []),
      chemin, prefixe,
    ];
    await executer("pdftoppm", args, { maxBuffer: 64 * 1024 * 1024 });
    return readFile(`${prefixe}.${format === "png" ? "png" : "ppm"}`);
  });
}
