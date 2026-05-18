// Script pour appliquer la migration partielle (uniquement les éléments manquants)
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Créer la table fiches_degustation si elle n'existe pas
        await client.query(`
            CREATE TABLE IF NOT EXISTS "fiches_degustation" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "produit_id" uuid NOT NULL REFERENCES "produits"("id") ON DELETE CASCADE,
                "date_degustation" varchar(50),
                "degustateur" varchar(100),
                "numero_de_lot" varchar(100),
                "moment_degustation" varchar(100),
                "poids_infuse" varchar(50),
                "temperature_degustation" varchar(50),
                "temps_degustation" varchar(50),
                "feuilles_seches_aspect" text,
                "feuilles_seches_couleur" text,
                "feuilles_seches_senteur" text,
                "feuilles_infusees_aspect" text,
                "feuilles_infusees_couleur" text,
                "feuilles_infusees_senteur" text,
                "infusion_aspect_couleur" text,
                "infusion_parfum" text,
                "saveur_bouche" text,
                "fichier_source_nom" varchar(255),
                "cree_le" timestamp DEFAULT now() NOT NULL
            );
        `);
        console.log('✓ Table fiches_degustation créée (ou déjà existante)');

        // 2. Ajouter les colonnes manquantes dans produits (une par une avec IF NOT EXISTS)
        const newColumns = [
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "fournisseur" varchar(255)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "code_article_fournisseur" varchar(100)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "designation_fournisseur" varchar(255)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "flo_id" varchar(100)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "epoque_recolte" varchar(100)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "technique_recolte" varchar(255)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "organisme_certificateur" varchar(100)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "grade" varchar(100)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "volumineux" boolean`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "nom_latin" varchar(255)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "labels_mp" json`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "labels_client" json`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "gamme_conditionnement" varchar(255)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "date_mise_marche" varchar(100)`,
            `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "commentaires" text`,
        ];

        for (const sql of newColumns) {
            await client.query(sql);
            const col = sql.match(/ADD COLUMN IF NOT EXISTS "([^"]+)"/)?.[1];
            console.log(`✓ Colonne ${col} ajoutée (ou déjà existante)`);
        }

        // 3. Vérifier les colonnes de notifications (si migration 0001 partielle)
        const notifColumns = [
            `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "utilisateurs"("id") ON DELETE CASCADE`,
            `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" varchar(255)`,
            `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false NOT NULL`,
            `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link" varchar(512)`,
        ];
        for (const sql of notifColumns) {
            try {
                await client.query(sql);
            } catch (e) {
                // Ignore les erreurs de contrainte NOT NULL si la colonne existe déjà
            }
        }
        console.log('✓ Colonnes notifications vérifiées');

        await client.query('COMMIT');
        console.log('\n✅ Migration réussie !');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur migration:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
