import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

import { auth } from "@/auth";
import { RAGService } from "@/agents/knowledge/RAGService";
import { extractPdfText } from "@/lib/utils/pdf-text";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (matches the UI hint)

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json(
                { error: "Fichier trop volumineux (max 10 Mo)." },
                { status: 400 }
            );
        }

        const buffer = await file.arrayBuffer();
        const name = file.name.toLowerCase();
        let rawText = "";

        if (name.endsWith(".txt")) {
            rawText = new TextDecoder().decode(buffer);
        } else if (name.endsWith(".docx")) {
            const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
            rawText = result.value;
        } else if (name.endsWith(".pdf")) {
            rawText = await extractPdfText(buffer);
        } else {
            return NextResponse.json(
                { error: "Format non supporté (PDF, DOCX ou TXT)." },
                { status: 400 }
            );
        }

        if (!rawText.trim()) {
            return NextResponse.json(
                { error: "Aucun texte exploitable extrait du document." },
                { status: 400 }
            );
        }

        const chunksIngested = await RAGService.ingestDocument(file.name, rawText);

        if (chunksIngested === 0) {
            return NextResponse.json(
                {
                    error:
                        "Aucun chunk vectorisé (embeddings indisponibles ? vérifier la clé Mistral).",
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            status: "SUCCESS",
            message: `Document analysé. ${chunksIngested} chunks vectorisés et ajoutés au RAG.`,
            documentName: file.name,
        });
    } catch (error) {
        console.error("Knowledge upload error:", error);
        const message = error instanceof Error ? error.message : "Erreur serveur.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
