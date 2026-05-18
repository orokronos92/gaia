import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import xlsx from "xlsx";
import * as schema from "./schema";

config({ path: resolve(process.cwd(), ".env.local") });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// Helper function to find a key that includes a string, ignoring case and trailing spaces
function findKey(row: any, searchStr: string): any {
    const keys = Object.keys(row);
    const found = keys.find(k => k.toLowerCase().includes(searchStr.toLowerCase()));
    return found ? row[found] : null;
}

async function seedRealData() {
    console.log("🌱 Début de l'importation de la BDD Excel 2025...");

    try {
        const filePath = resolve(process.cwd(), 'docs', 'BDD étiquettes 2025 extrait dec 2025.xlsx');
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

        console.log(`📊 ${rows.length} lignes trouvées dans le fichier Excel.`);
        if (rows.length > 0) {
            console.log("Colonnes trouvées:", Object.keys(rows[0]));
        }

        console.log("🧹 Nettoyage des tables produits et étiquettes existantes...");
        await db.delete(schema.commandesImpression);
        await db.delete(schema.auditLogs);
        await db.delete(schema.notifications);
        await db.delete(schema.controlesConformite);
        await db.delete(schema.commentairesEtiquettes);
        await db.delete(schema.versionsEtiquettes);
        await db.delete(schema.fichesEtiquettes);
        await db.delete(schema.ingredientsRecette);
        await db.delete(schema.recettes);
        await db.delete(schema.labelsProduits);
        await db.delete(schema.produits);

        let importedCount = 0;

        for (const row of rows) {
            const codePf = findKey(row, 'CODE PF');
            const denomination = findKey(row, 'DÉNOMINATION FR'); // Fix column name

            if (!codePf || !denomination) {
                continue;
            }

            try {
                const codePfStr = String(codePf).trim();

                const exist = await db.query.produits.findFirst({
                    where: (p, { eq }) => eq(p.codePf, codePfStr)
                });
                if (exist) continue;

                const [nouveauProduit] = await db.insert(schema.produits).values({
                    codePf: codePfStr,
                    gamme: findKey(row, 'GAMME') || 'Gamme Standard',
                    sousGamme: findKey(row, 'SOUS GAMME') || null,
                    denominationFr: denomination,
                    denominationEn: findKey(row, 'DENOMINATION EN') || null,
                    sousDesignationFr: findKey(row, 'SOUS-DÉS FR') || null,
                    sousDesignationEn: findKey(row, 'SOUS-DÉS EN') || null,
                    typeTheFr: findKey(row, 'TYPE DE THÉ') || findKey(row, 'TYPE DE PLANTE') || "Thé",
                    origine: findKey(row, 'ORIGINE') || null,
                    producteurJardin: findKey(row, 'PRODUCTEUR') || null,
                    estAromatise: !!findKey(row, 'Aromatisé'),
                    conditionnement: findKey(row, 'CONDITIONNEMENT') || 'Vrac',
                    codeEan: findKey(row, 'CODE EAN') ? String(findKey(row, 'CODE EAN')) : null,
                    poidsNet: findKey(row, 'POIDS G OU KG') ? String(findKey(row, 'POIDS G OU KG')) : null,
                    tempsInfusion: findKey(row, "TPS MIN D'INFUSION") ? String(findKey(row, "TPS MIN D'INFUSION")) : null,
                    tempInfusion: findKey(row, "T° C INFUSION") ? String(findKey(row, "T° C INFUSION")) : null,
                    poidsTasse: findKey(row, 'TASSE DE 25 CL') ? String(findKey(row, 'TASSE DE 25 CL')) : null,
                    nbTasses: findKey(row, 'NBRE DE TASSES') ? String(findKey(row, 'NBRE DE TASSES')) : null,
                    plusieursInfusions: !!findKey(row, 'PLUSIEURS INFUSIONS'),
                    mentionEcocert: findKey(row, 'CERTIF ECOCERT') || null,
                }).returning({ id: schema.produits.id });

                await db.insert(schema.fichesEtiquettes).values({
                    produitId: nouveauProduit.id,
                    codeEtiquette: findKey(row, 'CODE ETİQUETTE') || findKey(row, 'CODE ETIQUETTE') || null,
                    denominationLegale: denomination,
                    texteCommercialFr: findKey(row, 'TEXTE COMMERCIAL FR'),
                    texteCommercialEn: findKey(row, 'TEXTE COMMERCIAL EN'),
                    ingredientsFr: findKey(row, "INGRÉDIENTS FR") || findKey(row, "INGREDIENTS FR"),
                    ingredientsEn: findKey(row, 'INGREDIENTS EN'),
                    allergenes: findKey(row, 'ALLERGENES'),
                    allegationsSanteFr: findKey(row, 'ALLÉGATIONS SANTÉ FR') || findKey(row, 'ALLEGATIONS SANTE FR'),
                    allegationsSanteEn: findKey(row, 'ALLÉGATIONS SANTÉ EN') || findKey(row, 'ALLEGATIONS SANTE EN'),
                    phraseWftoFr: findKey(row, 'PHRASE WFTO FR'),
                    sousDesignationDe: findKey(row, 'SOUS DES DE'),
                    ingredientsDe: findKey(row, 'INGREDIENTS DE'),
                    sousDesignationIt: findKey(row, 'SOUS DES IT'),
                    ingredientsIt: findKey(row, 'INGREDIENTS IT'),
                    sousDesignationNl: findKey(row, 'SOUS DES NL'),
                    ingredientsNl: findKey(row, "INGREDIENTS NL"),
                    statut: "QUALITY_REVIEW",
                });

                importedCount++;
            } catch (err: any) {
                console.error(`Erreur sur l'import de ${codePf}: ${err.message}`);
            }
        }

        console.log(`✅ Succès ! ${importedCount} fiches produits ont été importées dans la base PostgreSQL.`);

    } catch (e) {
        console.error("❌ Erreur pendant le seeding :", e);
    } finally {
        await pool.end();
    }
}

seedRealData();
