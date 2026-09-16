import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

/**
 * `next build` imports every route module to collect its config, so the
 * database module has to survive being imported with no database configured —
 * which is the situation inside a container build. This caught a real failure
 * once and is here so it cannot come back quietly.
 */
describe("the database module", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  it("imports cleanly with no DATABASE_URL", async () => {
    const module = await import("../src/lib/db/index");
    assert.ok(module.db, "db should exist without a connection behind it");
    assert.ok(module.pool);
  });

  it("complains only once something actually reaches for the database", async () => {
    const { db } = await import("../src/lib/db/index");
    assert.throws(() => db.select(), /DATABASE_URL is not set/);
  });
});
