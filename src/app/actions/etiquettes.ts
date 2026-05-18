"use server"

import { db } from "@/db"
import { fichesEtiquettes } from "@/db/schema"
import { redirect } from "next/navigation"

export async function createFicheEtiquette(formData: FormData) {
    const produitId = formData.get("produitId") as string;

    if (!produitId) {
        throw new Error("Produit ID manquant");
    }

    // Créer la fiche
    const [nouvelleFiche] = await db.insert(fichesEtiquettes)
        .values({
            produitId,
            statut: "QUALITY_REVIEW",
        })
        .returning({ id: fichesEtiquettes.id });

    // Rediriger vers la page de détail
    redirect(`/etiquettes/${nouvelleFiche.id}`);
}
