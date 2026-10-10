import "server-only";
import { Pool, types } from "pg";

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JS Dates,
// which avoids timezone shifts. NUMERIC columns become JS numbers.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => parseFloat(v));

const globalForDb = globalThis as unknown as { pool?: Pool };

// Reuse one pool across hot reloads in development.
export const pool =
  globalForDb.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
