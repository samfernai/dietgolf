/**
 * Container entrypoint: bring the schema up to date, then hand over to the
 * Next.js standalone server.
 */
import path from "node:path";
import { migrate } from "./migrate.mjs";

await migrate(path.resolve(import.meta.dirname, "..", "drizzle"));
await import("../server.js");
