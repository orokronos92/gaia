import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from './index';
import { eq, sql } from 'drizzle-orm';
import { utilisateurs, produits, fichesEtiquettes, versionsEtiquettes, commandesImpression, controlesConformite } from './schema';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    console.log("🌱 Début du DB Seed...");

    console.log("- Nettoyage de la base (TRUNCATE)...");
    await db.execute(sql`TRUNCATE TABLE utilisateurs, produits RESTART IDENTITY CASCADE`);

    const passwordHash = await bcrypt.hash("gaia2026", 10);

    // 1. Utilisateurs
    console.log("- Création Utilisateurs");
    const [marie, jean, dir] = await db.insert(utilisateurs).values([
        { nom: "Marie Qualité", email: "marie@jardinsdegaia.com", motDePasse: passwordHash, role: "QUALITE" },
        { nom: "Jean Graphiste", email: "jean@jardinsdegaia.com", motDePasse: passwordHash, role: "GRAPHISME" },
        { nom: "Direction", email: "dir@jardinsdegaia.com", motDePasse: passwordHash, role: "DIRECTION" },
    ]).returning();

    // 2. Produits
    console.log("- Création Produits");
    const [mf, tv, rv] = await db.insert(produits).values([
        { codePf: "TB4041", gamme: "Thés Bien-Être", denominationFr: "Maté Fruité", typeTheFr: "Maté", estAromatise: true, origine: "Brésil", poidsNet: "100g" },
        { codePf: "TB5052", gamme: "Thés Verts", denominationFr: "Thé Vert Sencha", typeTheFr: "Thé Vert nature", estAromatise: false, origine: "Japon", poidsNet: "100g" },
        { codePf: "TB6063", gamme: "Rooibos", denominationFr: "Rooibos Vanille", typeTheFr: "Rooibos", estAromatise: true, origine: "Afrique du Sud", poidsNet: "100g" }
    ]).returning();

    // 3. Fiches Étiquettes (Code généré automatiquement dans l'app, on le mock ici)
    console.log("- Création Fiches Étiquettes");
    const [ficheMf, ficheTv, ficheRv] = await db.insert(fichesEtiquettes).values([
        { produitId: mf.id, codeEtiquette: "ET-MF-01", statut: "QUALITY_VALIDATED", creePar: marie.id },
        { produitId: tv.id, codeEtiquette: "ET-TV-01", statut: "QUALITY_REVIEW", creePar: marie.id },
        { produitId: rv.id, codeEtiquette: "ET-RV-01", statut: "DESIGN_IN_PROGRESS", creePar: marie.id }
    ]).returning();

    // 4. Versions
    console.log("- Création Versions et Historique");
    const [v1Mf] = await db.insert(versionsEtiquettes).values([
        { ficheEtiquetteId: ficheMf.id, numeroVersion: 1, donneesSnapshot: { note: "First draft" }, statut: "QUALITY_VALIDATED", creePar: marie.id, validePar: marie.id, valideLe: new Date() }
    ]).returning();

    // Update the pointer
    await db.update(fichesEtiquettes).set({ versionCouranteId: v1Mf.id }).where(eq(fichesEtiquettes.id, ficheMf.id));

    // 5. Commandes
    console.log("- Création Commandes Impression");
    await db.insert(commandesImpression).values([
        { versionEtiquetteId: v1Mf.id, quantite: 5000, prix: 1200, statutReception: "CONFORME" }
    ]);

    // 6. Controles
    console.log("- Création Contrôles (Alertes Dashboard)");
    await db.insert(controlesConformite).values([
        { ficheEtiquetteId: ficheTv.id, typeControle: "QUID", statut: "FAIL", details: { message: "Calcul QUID erroné sur la citronnelle" }, controlePar: "AI_AUDIT" },
        { ficheEtiquetteId: ficheTv.id, typeControle: "ALLEGATION", statut: "WARNING", details: { message: "Allégation sensible détectée : 'Détox'" }, controlePar: "AI_AUDIT" },
        { ficheEtiquetteId: ficheRv.id, typeControle: "ROUNDING", statut: "FAIL", details: { message: "Tolérance des 100% dépassée" }, controlePar: "AI_AUDIT" }
    ]);

    console.log("✅ Seed terminé !");
    await pool.end();
    process.exit(0);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
