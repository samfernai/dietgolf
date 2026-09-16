/**
 * `next build` with `output: "standalone"` emits a server that expects the
 * static assets to sit next to it. Copying them in here means `npm start` and
 * the container run exactly the same way.
 */
import { cp, access } from "node:fs/promises";

const standalone = ".next/standalone";

try {
  await access(standalone);
} catch {
  console.error("No standalone output found — run `next build` first.");
  process.exit(1);
}

await cp(".next/static", `${standalone}/.next/static`, { recursive: true });
await cp("public", `${standalone}/public`, { recursive: true });
await cp("drizzle", `${standalone}/drizzle`, { recursive: true });
console.log("Bundled static assets, public files and migrations into .next/standalone.");
