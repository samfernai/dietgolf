import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Connection = { pool: Pool; db: NodePgDatabase<typeof schema> };

declare global {
  // Reused across hot reloads in development so we do not leak connections.
  // eslint-disable-next-line no-var
  var __dietGolfConnection: Connection | undefined;
}

let connection: Connection | undefined;

function connect(): Connection {
  const existing = connection ?? globalThis.__dietGolfConnection;
  if (existing) return (connection = existing);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres database.",
    );
  }

  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    // Cloud Run scales to zero, so keep the pool lean and let idle sockets go.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...(process.env.DATABASE_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const created: Connection = { pool, db: drizzle(pool, { schema }) };
  connection = created;
  if (process.env.NODE_ENV !== "production") globalThis.__dietGolfConnection = created;
  return created;
}

/**
 * Connects on first property access rather than at import.
 *
 * `next build` imports every route module to collect its config, so anything
 * that reads DATABASE_URL at the top level fails a build that has no database
 * to hand — which is exactly what a container build is. Deferring the work
 * keeps the build honest without making call sites pass a handle around.
 */
function lazy<T extends object>(pick: (connection: Connection) => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const resolved = pick(connect()) as Record<PropertyKey, unknown>;
      const value = resolved[property];
      return typeof value === "function" ? value.bind(resolved) : value;
    },
    has(_target, property) {
      return property in (pick(connect()) as object);
    },
  });
}

export const db = lazy((c) => c.db);
export const pool = lazy((c) => c.pool);

/** Opens the connection eagerly — used by scripts that want to fail fast. */
export function connectNow(): Connection {
  return connect();
}

export { schema };
