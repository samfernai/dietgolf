/**
 * Applies the SQL files in ./drizzle in order, once each.
 *
 * This is deliberately a small standalone script rather than drizzle-kit: the
 * production container runs it too, and it has only `pg` available there. Both
 * paths share this file so local and deployed databases stay in step.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

/** Arbitrary but fixed, so concurrent instances queue instead of racing. */
const LOCK_ID = 560747;

export async function migrate(migrationsDir = path.resolve("drizzle")) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — the app cannot start without a database.");
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DATABASE_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS __migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);

    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    const { rows } = await client.query("SELECT name FROM __migrations");
    const applied = new Set(rows.map((row) => row.name));

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      console.log(`Applying ${file}…`);
      await client.query("BEGIN");
      try {
        // drizzle-kit separates statements with this marker.
        for (const statement of sql.split("--> statement-breakpoint")) {
          if (statement.trim()) await client.query(statement);
        }
        await client.query("INSERT INTO __migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        ran += 1;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log(
      ran === 0
        ? `Schema already up to date (${files.length} migration${files.length === 1 ? "" : "s"}).`
        : `Applied ${ran} migration${ran === 1 ? "" : "s"}.`,
    );
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await client.end().catch(() => {});
  }
}

// Run directly: `npm run db:migrate`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate().catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
}
