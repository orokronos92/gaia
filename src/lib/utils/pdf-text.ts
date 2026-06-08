/**
 * Extract raw text from a PDF buffer using pdf2json — the parser that works
 * under Next.js 16 / Turbopack, where pdf-parse crashes (same choice as the
 * ImportWorker). Used by the knowledge-base ingestion (RAG lot D).
 *
 * Hardened (lot D fix): some PDFs trigger an internal pdf2json error (e.g.
 * `this.toUnicode.indexOf is not a function`) that escapes as an *unhandled
 * rejection* and never fires `pdfParser_dataError`, leaving the promise to hang
 * forever. A timeout guarantees the promise always settles so the caller gets a
 * clear error instead of an infinite spinner.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

export async function extractPdfText(
  buffer: ArrayBuffer,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFParser = require("pdf2json");
  const parser = new PDFParser(null, 1); // 1 = raw text content

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(
      () =>
        finish(() =>
          reject(
            new Error(
              "Lecture PDF trop longue (timeout) — ce PDF n'est pas extractible automatiquement. Convertissez-le en TXT/DOCX."
            )
          )
        ),
      timeoutMs
    );

    parser.on("pdfParser_dataError", (errData: { parserError?: unknown }) =>
      finish(() =>
        reject(
          new Error(
            `Lecture PDF impossible : ${String(errData?.parserError ?? "format illisible")}`
          )
        )
      )
    );

    parser.on("pdfParser_dataReady", () =>
      finish(() => {
        try {
          let text: string = parser.getRawTextContent() || "";
          text = text.replace(/%E2%80%99/g, "'").replace(/%20/g, " ").trim();
          resolve(text);
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Extraction PDF échouée"));
        }
      })
    );

    try {
      parser.parseBuffer(Buffer.from(buffer));
    } catch (e) {
      finish(() =>
        reject(e instanceof Error ? e : new Error("Extraction PDF échouée"))
      );
    }
  });
}
