import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // Reused across hot reloads in development so we do not leak connections.
  // eslint-disable-next-line no-var
  var __dietGolfPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres database.",
    );
  }
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    // Cloud Run scales to zero, so keep the pool lean and let idle sockets go.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...(process.env.DATABASE_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

export const pool = globalThis.__dietGolfPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__dietGolfPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
