/**
 * Rejoue l'extraction de recette sur les classeurs déjà stockés dans MinIO.
 *
 * L'extraction lisait le classeur aplati en texte et devait en redeviner la
 * grille de colonnes ; elle s'est trompée environ un import sur trois, et les
 * trois coches « commerce équitable » de TA602 sont arrivées en base en coches
 * Demeter. Le lecteur déterministe corrige la lecture, mais les recettes déjà
 * enregistrées portent encore l'ancienne. Ce script les rejoue à partir du
 * document d'origine — la seule source qui fasse foi.
 *
 *   npx tsx scripts/reimporter-recettes.ts              # simulation, n'écrit rien
 *   npx tsx scripts/reimporter-recettes.ts --appliquer  # écrit
 *
 * Seuls les produits actifs ayant un document RECETTE_XLSX conservé sont
 * traités, avec leur classeur le plus récent.
 */
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "../src/db";
import { documentsImport, ingredientsRecette, produits, recettes } from "../src/db/schema";
import { extraireRecetteDepuisXlsx } from "../src/agents/imports/recetteExtractor";
import { saveRecette } from "../src/db/queries/recettes";
import { getObjectBuffer } from "../src/lib/utils/s3-client";

const BUCKET_IMPORTS = "import-sources";
const APPLIQUER = process.argv.includes("--appliquer");

async function main(): Promise<void> {
    const documents = await db
        .select({
            produitId: documentsImport.produitId,
            codePf: produits.codePf,
            denomination: produits.denominationFr,
            cleS3: documentsImport.cleS3,
            nom: documentsImport.nomOrigine,
            importeLe: documentsImport.importeLe,
        })
        .from(documentsImport)
        .innerJoin(produits, eq(produits.id, documentsImport.produitId))
        // Les produits retirés gardent leurs documents (ON DELETE SET NULL) : quatre
        // anciens TA7372 traînent ainsi en base. Seul l'actif porte la fiche vivante.
        .where(and(eq(documentsImport.type, "RECETTE_XLSX"), isNull(produits.archiveLe)))
        .orderBy(desc(documentsImport.importeLe));

    // Un produit peut avoir plusieurs imports successifs : le dernier fait foi.
    const parProduit = new Map<string, (typeof documents)[number]>();
    for (const doc of documents) {
        if (doc.produitId && !parProduit.has(doc.produitId)) parProduit.set(doc.produitId, doc);
    }

    console.log(`${parProduit.size} produit(s) avec un classeur recette conservé.`);
    console.log(APPLIQUER ? "MODE ÉCRITURE\n" : "SIMULATION — aucune écriture\n");

    for (const [produitId, doc] of parProduit) {
        const buffer = await getObjectBuffer(doc.cleS3, BUCKET_IMPORTS);
        const importee = await extraireRecetteDepuisXlsx(
            buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
        );
        if (!importee) {
            console.log(`${doc.codePf} — ${doc.nom} : extraction vide, ignoré.`);
            continue;
        }

        const actuelle = await db.query.recettes.findFirst({
            where: and(eq(recettes.produitId, produitId), ne(recettes.statut, "ARCHIVED")),
            orderBy: [desc(recettes.creeLe)],
        });
        const avant = actuelle
            ? await db.query.ingredientsRecette.findMany({
                  where: eq(ingredientsRecette.recetteId, actuelle.id),
              })
            : [];
        const parCode = new Map(avant.map((l) => [l.codeArticle, l]));

        console.log(`=== ${doc.codePf} — ${doc.denomination}`);
        console.log(
            `    source=${importee.source} | version "${actuelle?.version ?? "—"}" → "${importee.version ?? "—"}"` +
                ` | incidence étiquetage ${actuelle?.incidenceEtiquetage ?? "null"} → ${importee.incidenceEtiquetage ?? "null"}`
        );

        let changements = 0;
        for (const apres of importee.calc.ingredients) {
            const av = parCode.get(apres.codeArticle);
            const diffs: string[] = [];
            if (!av) diffs.push("ligne absente avant");
            else {
                if (av.estDemeter !== apres.estDemeter) diffs.push(`Demeter ${av.estDemeter} → ${apres.estDemeter}`);
                if (av.estEquitable !== apres.estEquitable) diffs.push(`équitable ${av.estEquitable} → ${apres.estEquitable}`);
                if (Math.abs(av.quantiteKg - apres.quantiteKg) > 1e-6) diffs.push(`kg ${av.quantiteKg} → ${apres.quantiteKg}`);
            }
            if (diffs.length > 0) {
                changements++;
                console.log(`    ${apres.codeArticle.padEnd(7)} ${apres.designation.slice(0, 32).padEnd(33)} ${diffs.join(", ")}`);
            }
        }
        if (changements === 0) console.log("    (aucun changement de ligne)");
        if (importee.ecartsPourcentage.length > 0) {
            console.log(
                `    écarts avec la colonne % de JDG : ` +
                    importee.ecartsPourcentage.map((e) => `${e.codeArticle} ${e.calcule} ≠ ${e.fiche}`).join(", ")
            );
        }
        for (const anomalie of importee.anomalies) console.log(`    ⚠ ${anomalie}`);

        if (APPLIQUER) {
            await saveRecette({
                produitId,
                version: importee.version ?? "1.0",
                developpeur: importee.developpeur ?? "Réimport",
                date: importee.date,
                saveurOrigine: importee.saveurOrigine,
                calc: importee.calc,
                descriptifModification: importee.descriptifModification,
                raisonModification: importee.raisonModification,
                incidenceEtiquetage: importee.incidenceEtiquetage,
                sourceExtraction: importee.source,
                ecartsPourcentage: importee.ecartsPourcentage,
                qualifieLesMatieres: importee.source === "DETERMINISTE",
            });
            console.log("    → recette réécrite (DRAFT, à valider par la Qualité)");
        }
        console.log("");
    }
}

main().then(
    () => process.exit(0),
    (e) => {
        console.error(e);
        process.exit(1);
    }
);
