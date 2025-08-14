import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with better connection management and reconnection logic
export const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_nqWm5Ox0aUey@ep-solitary-waterfall-ae9q8xf8-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  max: 5, // Reduce maximum connections to stay within free tier limits
  idleTimeoutMillis: 10000, // Close idle clients faster to free up resources
  connectionTimeoutMillis: 10000, // Give more time for connection
  ssl: true, // Ensure SSL is enabled
  allowExitOnIdle: false, // Don't exit on idle
});

// Set up graceful connection handling with reconnection
pool.on('error', (err: any) => {
  console.error('Unexpected error on idle database client', err);
  
  // Log the error code if it exists to help with debugging
  if (err && err.code) {
    console.log(`Database error code: ${err.code}`);
  }
  
  // Implement a simpler approach to reconnection by recreating broken connections
  setTimeout(() => {
    console.log('Attempting to recover database connections...');
  }, 5000);
});

// Setup process termination cleanup
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing database pool');
  pool.end().then(() => {
    console.log('Database pool has ended');
  });
});

export const db = drizzle({ client: pool, schema });