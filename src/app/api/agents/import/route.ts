import { NextResponse } from "next/server";
import { ImportWorker } from "@/agents/imports/importWorker";
import { auth } from "@/auth";
import {
    archiverDocumentImport,
    rattacherDocumentImport,
    type TypeDocumentImport,
} from "@/db/queries/documents-import";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
    try {
        const formData = await req.formData();

        const wordFile = formData.get("wordFile") as File | null;
        const excelFile = formData.get("excelFile") as File | null;
        const pdfFile = formData.get("pdfFile") as File | null;

        if (!wordFile && !excelFile && !pdfFile) {
            return NextResponse.json(
                { error: "Au moins un document est requis (DOCX, XLSX ou PDF)." },
                { status: 400 }
            );
        }

        const docxBuffer = wordFile ? await wordFile.arrayBuffer() : undefined;
        const xlsxBuffer = excelFile ? await excelFile.arrayBuffer() : undefined;
        const pdfBuffer = pdfFile ? await pdfFile.arrayBuffer() : undefined;

        // Archive the sources BEFORE extracting: a failed import is exactly when
        // the document is worth keeping. The product is unknown at this point —
        // it is the extraction's result — so the rows are attached afterwards.
        const aArchiver: [File | null, ArrayBuffer | undefined, TypeDocumentImport][] = [
            [wordFile, docxBuffer, "DEGUSTATION_DOCX"],
            [excelFile, xlsxBuffer, "RECETTE_XLSX"],
            [pdfFile, pdfBuffer, "DEGUSTATION_PDF"],
        ];
        const documentIds: string[] = [];
        for (const [fichier, buffer, type] of aArchiver) {
            if (!fichier || !buffer) continue;
            const id = await archiverDocumentImport({
                buffer,
                nomOrigine: fichier.name,
                type,
                utilisateurId: session.user.id,
            });
            if (id) documentIds.push(id);
        }

        const resolutionRaw = formData.get("resolution");
        const resolution = resolutionRaw === "overwrite" || resolutionRaw === "new" ? resolutionRaw : undefined;

        const importResult = await ImportWorker.processImport({ docxBuffer, xlsxBuffer, pdfBuffer }, session.user.id, resolution);

        // codePf déjà existant et pas de résolution → on laisse Marie choisir.
        if (importResult.status === "CONFLICT") {
            return NextResponse.json({
                conflict: true,
                codePf: importResult.codePf,
                ficheExistanteId: importResult.ficheExistanteId,
            });
        }

        for (const documentId of documentIds) {
            await rattacherDocumentImport(documentId, {
                produitId: importResult.produitId,
                ficheEtiquetteId: importResult.ficheId,
            });
        }

        return NextResponse.json({
            success: true,
            data: importResult.parsedFields,
            ficheId: importResult.ficheId,
            produitId: importResult.produitId,
            message: importResult.message,
        });
    } catch (error) {
        const details = error instanceof Error ? error.message : "Erreur inconnue";
        console.error("[API Import] Erreur:", details, error instanceof Error ? error.stack : "");
        return NextResponse.json(
            { error: details, details },
            { status: 500 }
        );
    }
}
