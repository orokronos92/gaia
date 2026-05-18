import { db } from "@/db"
import { fichesEtiquettes, produits, fichesDegustation } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import EtiquetteClient from "./EtiquetteClient"
import { notFound } from "next/navigation"
import { getPublicUrl, findFileKeysByPrefix } from "@/lib/utils/s3-client"

export default async function EtiquetteDetailPage(
    props: {
        params: Promise<{ id: string }>;
    }
) {
    const params = await props.params;
    const { id } = params;

    const data = await db
        .select({
            id: fichesEtiquettes.id,
            title: produits.denominationFr,
            code: fichesEtiquettes.codeEtiquette,
            codePf: produits.codePf,
            gamme: produits.gamme,
            sousGamme: produits.sousGamme,
            status: fichesEtiquettes.statut,
            date: fichesEtiquettes.misAJourLe,
            conditionnement: produits.conditionnement,
            poidsNet: produits.poidsNet,
            tempsInfusion: produits.tempsInfusion,
            tempInfusion: produits.tempInfusion,
            origine: produits.origine,
            estAromatise: produits.estAromatise,
            mentionEcocert: produits.mentionEcocert,
            typeTheFr: produits.typeTheFr,
            nbTasses: produits.nbTasses,
            plusieursInfusions: produits.plusieursInfusions,
            texteCommercialFr: fichesEtiquettes.texteCommercialFr,
            ingredientsFr: fichesEtiquettes.ingredientsFr,
            ingredientsEn: fichesEtiquettes.ingredientsEn,
            ingredientsDe: fichesEtiquettes.ingredientsDe,
            ingredientsIt: fichesEtiquettes.ingredientsIt,
            ingredientsNl: fichesEtiquettes.ingredientsNl,
            sousDesignationFr: produits.sousDesignationFr,
            sousDesignationEn: produits.sousDesignationEn,
            sousDesignationDe: fichesEtiquettes.sousDesignationDe,
            sousDesignationIt: fichesEtiquettes.sousDesignationIt,
            sousDesignationNl: fichesEtiquettes.sousDesignationNl,
            allergenes: fichesEtiquettes.allergenes,
            allegationsSanteFr: fichesEtiquettes.allegationsSanteFr,
            phraseWftoFr: fichesEtiquettes.phraseWftoFr,
            mentionConservation: fichesEtiquettes.mentionConservation,
            mentionFabricant: fichesEtiquettes.mentionFabricant,
            // Nouveaux champs FD & PMI depuis Produits
            ingredientsSuggestion: produits.ingredientsSuggestion,
            allegationsPossibles: produits.allegationsPossibles,
            conditionnementsOptions: produits.conditionnementsOptions,
            declinaisons: produits.declinaisons,
            allergenesMp: produits.allergenesMp,
            allegationsMp: produits.allegationsMp,
            labelsMP: produits.labelsMP,
            infoProducteur: produits.infoProducteur,
            typeProducteur: produits.typeProducteur,
            origineMpa: produits.origineMpa,
            techniqueRecolte: produits.techniqueRecolte,
            epoqueRecolte: produits.epoqueRecolte,
            grade: produits.grade,
            volumineux: produits.volumineux,
            organismeCertificateur: produits.organismeCertificateur,
        })
        .from(fichesEtiquettes)
        .leftJoin(produits, eq(fichesEtiquettes.produitId, produits.id))
        .where(eq(fichesEtiquettes.id, id));

    if (!data || data.length === 0) {
        return notFound();
    }

    // Récupérer la dernière fiche de dégustation associée au produit (s'il y en a une)
    const degustationData = await db
        .select()
        .from(fichesDegustation)
        .where(eq(fichesDegustation.produitId, (await db.select({ pId: fichesEtiquettes.produitId }).from(fichesEtiquettes).where(eq(fichesEtiquettes.id, id)))[0]?.pId))
        .orderBy(desc(fichesDegustation.creeLe))
        .limit(1);

    const codePfLower = data[0]?.codePf?.toLowerCase() || "";

    // We search the Minio bucket dynamically for ALL files matching the codePf.
    const realFileKeys = await findFileKeysByPrefix(codePfLower);
    const pdfFiles = realFileKeys.map(key => ({
        url: getPublicUrl(key),
        name: key.split('/').pop() || key
    }));

    const labelData = {
        ...data[0],
        degustation: degustationData[0] || null, // NOUVEAU: Les notes de dégustation
        pdfFiles: pdfFiles,
        date: data[0].date ? new Date(data[0].date).toLocaleDateString("fr-FR") : "Récent"
    };

    return <EtiquetteClient labelData={labelData} />
}
