import { db } from "@/db"
import { fichesEtiquettes, produits, fichesDegustation } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import EtiquetteClient from "./EtiquetteClient"
import { notFound } from "next/navigation"
import { getPublicUrl } from "@/lib/utils/s3-client"
import { getFichiersProduit } from "@/db/queries/fichiers-etiquettes"
import { getDocumentsProduit, getLienDocument } from "@/db/queries/documents-import"
import { getRecetteOutputForProduit } from "@/db/queries/recettes"
import { getVersionsFiche } from "@/db/queries/fiches"

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
            produitId: fichesEtiquettes.produitId,
            title: produits.denominationFr,
            code: fichesEtiquettes.codeEtiquette,
            codePf: produits.codePf,
            gamme: produits.gamme,
            sousGamme: produits.sousGamme,
            retireLe: produits.retireLe,
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
            // SPEC-03 §6 — champs jusqu'ici non chargés
            labelsClient: produits.labelsClient,
            fournisseur: produits.fournisseur,
            floId: produits.floId,
            nomLatin: produits.nomLatin,
            dateMiseMarche: produits.dateMiseMarche,
            producteurJardin: produits.producteurJardin,
            allegationChoisie: fichesEtiquettes.allegationChoisie,
            nbTassesAllegation: fichesEtiquettes.nbTassesAllegation,
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

    // Recette QUID (SPEC-03) — lue côté serveur, mappée en RecetteAgentOutput.
    const recette = await getRecetteOutputForProduit(data[0].produitId);

    // Historique des versions (editable-fiche / versioning).
    const versions = await getVersionsFiche(id);

    // Label files come from the stored product ↔ file links, not from matching
    // names against the bucket: a name match once put a neighbouring product's
    // BAT on this page. Sources (.ai) are listed only when there is no BAT.
    const fichiers = await getFichiersProduit(data[0].produitId);
    const bats = fichiers.filter(f => f.type === "BAT");
    const pdfFiles = (bats.length > 0 ? bats : fichiers).map(f => ({
        url: getPublicUrl(f.cleS3),
        name: f.nomFichier
    }));

    const labelData = {
        ...data[0],
        degustation: degustationData[0] || null, // NOUVEAU: Les notes de dégustation
        pdfFiles: pdfFiles,
        date: data[0].date ? new Date(data[0].date).toLocaleDateString("fr-FR") : "Récent"
    };

    // Source documents live in a private bucket: each row gets its own short-lived
    // signed link, minted per render (the route is force-dynamic).
    const documents = await getDocumentsProduit(data[0].produitId);
    const documentsSource = await Promise.all(
        documents.map(async (d) => ({
            id: d.id,
            nomOrigine: d.nomOrigine,
            type: d.type,
            tailleOctets: d.tailleOctets,
            importeLe: d.importeLe.toLocaleDateString("fr-FR"),
            lien: await getLienDocument(d.cleS3),
        }))
    );

    // Le geste de suppression porte sur le PRODUIT : toutes ses fiches partent
    // avec lui. MT265 en a 17 — l'écran doit le dire avant, pas après.
    const fichesDuProduit = await db
        .select({ id: fichesEtiquettes.id })
        .from(fichesEtiquettes)
        .where(eq(fichesEtiquettes.produitId, data[0].produitId));

    return (
        <EtiquetteClient
            labelData={labelData}
            recette={recette}
            versions={versions}
            documentsSource={documentsSource}
            nbFiches={fichesDuProduit.length}
        />
    )
}
