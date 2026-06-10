/**
 * BAT text bridge — fetch a label artwork (BAT) from MinIO and extract its
 * vector text layer.
 *
 * Validated empirically on MT265 (contre-étiquette ETCMT2652V5): pdf2json
 * extracts the full ingredient list with its exact percentages, the net weight,
 * the label code and the health claim — 1258 chars, verbatim. JDG BAT PDFs
 * therefore carry a real Unicode text layer, not outlined glyphs, so the text
 * robot compares exact strings (deterministic) rather than guessing from OCR.
 */

import { extractPdfText } from "./pdf-text";
import { getObjectBuffer } from "./s3-client";

/** Fetches the BAT PDF at `fileKey` from MinIO and returns its extracted text. */
export async function extractBatText(fileKey: string): Promise<string> {
  const buffer = await getObjectBuffer(fileKey);
  return extractPdfText(buffer);
}
