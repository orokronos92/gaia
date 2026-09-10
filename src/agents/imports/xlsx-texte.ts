/**
 * Excel buffer → tab-separated text, one block per sheet.
 *
 * Kept only for the degraded path: this flattening is what loses the column
 * grid (a header cell holding "COMMERCE\nEQUITABLE" becomes three lines), so it
 * must never be the way a certification tick is read. See `xlsx-lecteur.ts`.
 */

import * as xlsx from "xlsx";

export function xlsxVersTexte(buffer: ArrayBuffer): string {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  let texte = "";
  for (const nom of workbook.SheetNames) {
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[nom], { header: 1 }) as unknown[][];
    texte += `\nFeuille: ${nom}\n`;
    texte += rows
      .filter((r) => r.some((c) => c !== null && c !== undefined && c !== ""))
      .map((r) => r.join("\t"))
      .join("\n");
  }
  return texte;
}
