import { config } from 'dotenv';
config({ path: '.env.local' });

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log('Migrations complete!');
    await pool.end();
    process.exit(0);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
