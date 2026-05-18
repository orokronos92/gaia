import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Create a PostgreSQL connection pool
// This manages multiple concurrent connections to handle scaling efficiently
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Initialize Drizzle with the pg pool and our schema
export const db = drizzle(pool, { schema });
