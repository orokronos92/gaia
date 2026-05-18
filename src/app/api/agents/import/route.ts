import { NextResponse } from "next/server";
import { ImportWorker } from "@/agents/imports/importWorker";

export async function POST(req: Request) {
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

        const importResult = await ImportWorker.processImport({ docxBuffer, xlsxBuffer, pdfBuffer });

        return NextResponse.json({
            success: true,
            data: importResult.parsedFields,
            ficheId: importResult.ficheId,
            produitId: importResult.produitId,
            message: importResult.message,
        });
    } catch (error: any) {
        console.error("[API Import] Erreur complète:", error?.message, "\nStack:", error?.stack);
        const details = error?.message ?? "Erreur inconnue";
        return NextResponse.json(
            { error: details, details },
            { status: 500 }
        );
    }
}
