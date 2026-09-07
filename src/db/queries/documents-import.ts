import { randomUUID } from "crypto";

import { and, desc, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { documentsImport } from "@/db/schema";
import { BUCKET_IMPORTS, getPresignedUrl, uploadFileToS3 } from "@/lib/utils/s3-client";

export type DocumentImport = typeof documentsImport.$inferSelect;
export type TypeDocumentImport = DocumentImport["type"];

const MIME_PAR_TYPE: Record<TypeDocumentImport, string> = {
    DEGUSTATION_DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    DEGUSTATION_PDF: "application/pdf",
    RECETTE_XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export interface ArchiverParams {
    buffer: ArrayBuffer;
    nomOrigine: string;
    type: TypeDocumentImport;
    utilisateurId?: string;
    /** Known upfront on a re-import; absent on a creation, where it is the result. */
    produitId?: string;
    ficheEtiquetteId?: string;
}

/**
 * Stores a source document and records it, BEFORE the extraction runs.
 *
 * Best-effort by design, like usage accounting: an unreachable bucket must never
 * fail a user's import. Returns the row id so the caller can attach the product
 * once extraction has named it, or `null` if archiving failed.
 */
export async function archiverDocumentImport(params: ArchiverParams): Promise<string | null> {
    try {
        // The original name is kept for display; the key is prefixed with a uuid
        // so two imports of "FD.docx" never collide.
        const cleS3 = `${randomUUID()}/${params.nomOrigine}`;
        const octets = Buffer.from(params.buffer);

        await uploadFileToS3(octets, cleS3, MIME_PAR_TYPE[params.type], BUCKET_IMPORTS);

        const [ligne] = await db
            .insert(documentsImport)
            .values({
                produitId: params.produitId ?? null,
                ficheEtiquetteId: params.ficheEtiquetteId ?? null,
                cleS3,
                nomOrigine: params.nomOrigine.slice(0, 255),
                type: params.type,
                tailleOctets: octets.byteLength,
                importePar: params.utilisateurId ?? null,
            })
            .returning({ id: documentsImport.id });

        return ligne.id;
    } catch {
        return null;
    }
}

/**
 * Attaches an archived document to the product the extraction produced. Only
 * fills what is still empty, so a re-run never re-parents an existing document.
 */
export async function rattacherDocumentImport(
    documentId: string,
    cibles: { produitId?: string; ficheEtiquetteId?: string }
): Promise<void> {
    try {
        await db
            .update(documentsImport)
            .set({
                ...(cibles.produitId ? { produitId: cibles.produitId } : {}),
                ...(cibles.ficheEtiquetteId ? { ficheEtiquetteId: cibles.ficheEtiquetteId } : {}),
            })
            .where(
                and(
                    eq(documentsImport.id, documentId),
                    or(isNull(documentsImport.produitId), isNull(documentsImport.ficheEtiquetteId))
                )
            );
    } catch {
        // Traceability must never break the import it traces.
    }
}

/** Documents behind a product's data, newest first. */
export async function getDocumentsProduit(produitId: string): Promise<DocumentImport[]> {
    return db
        .select()
        .from(documentsImport)
        .where(eq(documentsImport.produitId, produitId))
        .orderBy(desc(documentsImport.importeLe));
}

/** Short-lived signed link — the bucket is private and stays private. */
export async function getLienDocument(cleS3: string, secondes = 900): Promise<string> {
    return getPresignedUrl(cleS3, secondes, BUCKET_IMPORTS);
}
