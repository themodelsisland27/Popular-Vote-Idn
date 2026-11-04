import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool using the Object Method
export const createPool = () => {
  if (!global._postgresPool) {
    if (process.env.SQL_HOST) {
      // AI Studio Cloud SQL environment (Unix socket / Auth Proxy)
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    } else {
      // Vercel / External Cloud Database deployment
      const connectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
      const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
      const sslDisabled = connectionString.includes('sslmode=disable') || isLocal;

      global._postgresPool = new Pool({
        connectionString: connectionString || undefined,
        ssl: sslDisabled ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
export { pool };
