/**
 * Migration FD Schema v2
 * Ajoute les champs manquants des fiches de dégustation dans produits et fiches_etiquettes.
 * Utilise ADD COLUMN IF NOT EXISTS pour être idempotent (safe à relancer).
 */
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Migration FD Schema v2 — démarrage...');
        await client.query('BEGIN');

        // ─── Table produits ───────────────────────────────────────────────────
        const produitAlters = [
            // Allergènes & Allégations sur la MP
            `ALTER TABLE produits ADD COLUMN IF NOT EXISTS allergenes_mp VARCHAR(50)`,
            `ALTER TABLE produits ADD COLUMN IF NOT EXISTS allegations_mp VARCHAR(50)`,
            // Allégations structurées (tableau JSON d'options proposées dans le FD)
            `ALTER TABLE produits ADD COLUMN IF NOT EXISTS allegations_possibles JSONB`,
            // Ingrédients : liste simplifiée suggestion (avant liste QUID complète)
            `ALTER TABLE produits ADD COLUMN IF NOT EXISTS ingredients_suggestion TEXT`,
            // Conditionnements cochés dans le FD (JSON: gamme + format + grammage)
            `ALTER TABLE produits ADD COLUMN IF NOT EXISTS conditionnements_options JSONB`,
            // Déclinaisons prévues (ex: infusette cristal courant 2026)
            `ALTER TABLE produits ADD COLUMN IF NOT EXISTS declinaisons TEXT`,
            // Infos Producteur (nouveaux champs du FD)
            `ALTER TABLE produits ADD COLUMN IF NOT EXISTS info_producteur TEXT`,
            `ALTER TABLE produits ADD COLUMN IF NOT EXISTS type_producteur VARCHAR(100)`,
            `ALTER TABLE produits ADD COLUMN IF NOT EXISTS origine_mpa VARCHAR(255)`,
        ];

        for (const sql of produitAlters) {
            console.log(`  → ${sql.substring(0, 80)}...`);
            await client.query(sql);
        }

        // ─── Table fiches_etiquettes ──────────────────────────────────────────
        const etiquetteAlters = [
            // Allégation choisie par l'équipe qualité (après arbitrage des options)
            `ALTER TABLE fiches_etiquettes ADD COLUMN IF NOT EXISTS allegation_choisie VARCHAR(255)`,
            // Nombre de tasses lié à l'allégation retenue
            `ALTER TABLE fiches_etiquettes ADD COLUMN IF NOT EXISTS nb_tasses_allegation VARCHAR(50)`,
        ];

        for (const sql of etiquetteAlters) {
            console.log(`  → ${sql.substring(0, 80)}...`);
            await client.query(sql);
        }

        await client.query('COMMIT');
        console.log('✅ Migration FD Schema v2 — succès !');

        // Vérification
        const check = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'produits' 
              AND column_name IN ('allergenes_mp','allegations_mp','allegations_possibles','ingredients_suggestion','conditionnements_options','declinaisons', 'info_producteur', 'type_producteur', 'origine_mpa')
            ORDER BY column_name
        `);
        console.log('\n📋 Colonnes vérifiées dans `produits` :');
        check.rows.forEach(r => console.log(`  ✓ ${r.column_name} (${r.data_type})`));

        const check2 = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'fiches_etiquettes' 
              AND column_name IN ('allegation_choisie','nb_tasses_allegation')
            ORDER BY column_name
        `);
        console.log('\n📋 Colonnes vérifiées dans `fiches_etiquettes` :');
        check2.rows.forEach(r => console.log(`  ✓ ${r.column_name} (${r.data_type})`));

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur migration :', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
