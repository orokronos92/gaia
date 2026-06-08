/**
 * Extract raw text from a PDF buffer using pdf2json — the parser that works
 * under Next.js 16 / Turbopack, where pdf-parse crashes (same choice as the
 * ImportWorker). Used by the knowledge-base ingestion (RAG lot D). Rejects on a
 * parse error so the caller can surface a clear message.
 */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFParser = require("pdf2json");
  const parser = new PDFParser(null, 1); // 1 = raw text content

  return new Promise<string>((resolve, reject) => {
    parser.on("pdfParser_dataError", (errData: { parserError?: unknown }) => {
      reject(
        new Error(
          `Lecture PDF impossible : ${String(errData?.parserError ?? "format illisible")}`
        )
      );
    });

    parser.on("pdfParser_dataReady", () => {
      let text: string = parser.getRawTextContent() || "";
      // pdf2json returns some URL-encoded glyphs.
      text = text.replace(/%E2%80%99/g, "'").replace(/%20/g, " ").trim();
      resolve(text);
    });

    parser.parseBuffer(Buffer.from(buffer));
  });
}
