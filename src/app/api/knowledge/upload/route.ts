import { NextRequest, NextResponse } from "next/server";
import { RAGService } from "@/agents/knowledge/RAGService";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();

        let rawText = "";

        // Extremely basic text extraction for MVP.
        if (file.name.endsWith(".txt")) {
            rawText = new TextDecoder().decode(buffer);
        } else if (file.name.endsWith(".docx")) {
            // Usually we'd use mammoth here, similar to the ImportWorker
            const mammoth = require("mammoth");
            const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
            rawText = result.value;
        } else if (file.name.endsWith(".pdf")) {
            // For now, PDFs will just emit an error since we don't have pdf-parse setup
            // Return dummy text for demo purposes if we really want to simulate
            return NextResponse.json({ error: "Le parsing natif de PDF n'est pas installé dans le backend. Veuillez privilégier du TXT ou DOCX." }, { status: 400 });
        } else {
            return NextResponse.json({ error: "Format non supporté." }, { status: 400 });
        }

        // Pass to RAG service to chunk and embed
        const chunksIngested = await RAGService.ingestDocument(file.name, rawText);

        return NextResponse.json({
            status: "SUCCESS",
            message: `Document analysé. ${chunksIngested} chunks vectorisés et ajoutés au RAG.`,
            documentName: file.name
        });
    } catch (error: any) {
        console.error("Knowledge upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
