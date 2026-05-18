import { NextResponse } from 'next/server';
import { BatVisionAgent } from '@/agents/bat-agent';
import { db } from '@/db';
import { fichesEtiquettes, produits } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const etiquetteId = formData.get('etiquetteId') as string;

        if (!file || !etiquetteId) {
            return NextResponse.json({ success: false, error: 'Fichier BAT ou ID de l\'étiquette manquant' }, { status: 400 });
        }

        // Fetch DB Truth
        const dbResult = await db.select({
            fiche: fichesEtiquettes,
            produit: produits,
        })
            .from(fichesEtiquettes)
            .leftJoin(produits, eq(fichesEtiquettes.produitId, produits.id))
            .where(eq(fichesEtiquettes.id, etiquetteId))
            .limit(1);

        if (dbResult.length === 0) {
            return NextResponse.json({ success: false, error: 'Fiche introuvable en base' }, { status: 404 });
        }

        const { fiche } = dbResult[0];

        // Ensure we handle only images for this MVP 
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ success: false, error: 'Veuillez uploader une IMAGE (PNG/JPG) du BAT pour l\'agent Vision dans cette version.' }, { status: 400 });
        }

        // Convert file to base64
        const buffer = await file.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');

        const input = {
            batValide: {
                denominationLegale: fiche?.denominationLegale || "",
                ingredientsFr: fiche?.ingredientsFr || "",
                allegationsSanteFr: fiche?.allegationsSanteFr || "",
                allergenes: fiche?.allergenes || "",
                mentionsObligatoires: ["Eurofeuille (AB)", "Logo Triman / point vert", "Mention de l'origine"]
            },
            imageReceievedBase64: base64Data,
            imageMediaType: file.type as "image/jpeg" | "image/png" | "image/webp"
        };

        const agent = new BatVisionAgent();
        const output = await agent.execute(input);

        return NextResponse.json({ success: true, data: output });
    } catch (error: any) {
        console.error("Erreur API Vision BAT:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Erreur interne de l'agent Vision." },
            { status: 500 }
        );
    }
}
