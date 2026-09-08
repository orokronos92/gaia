/**
 * Extraction du texte d'un PDF, par poppler.
 *
 * Remplace `pdf2json` (2026-09-08). Celui-ci perdait des glyphes en silence :
 * le « M » de « Malin comme un chimpanzé » était absent de nos extractions alors
 * qu'il figure bien dans le fichier, ce qui a produit de faux avertissements
 * « dénomination non retrouvée » sur des étiquettes parfaitement conformes. Il
 * ne donnait pas non plus le nom réel des polices ni le corps des textes.
 *
 * Pour la géométrie, la typographie et les métriques, voir `pdf-bat.ts` — c'est
 * la même bibliothèque, exploitée plus profondément.
 *
 * Dépendance système : `poppler-utils` (GPL-2.0), invoqué en binaire. Aucune
 * liaison de code, donc aucune contrainte de licence sur l'application.
 */

import { execFile } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const executer = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Texte brut d'un PDF, mise en page conservée (`-layout`), ce qui garde les
 * colonnes et les tableaux lisibles pour les robots de comparaison et le RAG.
 */
export async function extractPdfText(
  buffer: ArrayBuffer | Uint8Array,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  const octets = Buffer.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
  const dossier = await mkdtemp(join(tmpdir(), "pdftxt-"));
  const chemin = join(dossier, "document.pdf");

  try {
    await writeFile(chemin, octets);
    const { stdout } = await executer("pdftotext", ["-layout", "-enc", "UTF-8", chemin, "-"], {
      timeout: timeoutMs,
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    if (detail.includes("ENOENT")) {
      throw new Error(
        "Lecture PDF impossible : poppler-utils n'est pas installé sur le serveur."
      );
    }
    throw new Error(`Lecture PDF impossible : ${detail}`);
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}
