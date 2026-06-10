/**
 * Applies supabase/setup.sql (all migrations + seed) to a Postgres database
 * over a direct connection. Use when you can't run the Supabase CLI locally.
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres" \
 *     node scripts/db-setup.mjs
 *
 * Get the string from: Supabase Dashboard → Connect → "Session pooler"
 * (or "Direct connection"), and paste your database password into it.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const conn = process.env.SUPABASE_DB_URL;

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("The 'pg' package is required. Install it with:  npm i -D pg");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = await readFile(path.join(here, "..", "supabase", "setup.sql"), "utf8");

// Prefer a full connection string; otherwise fall back to discrete PG* env vars
// (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE) — avoids URL-encoding the password.
const client = conn
  ? new pg.default.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  : new pg.default.Client({ ssl: { rejectUnauthorized: false } });

console.log("Connecting…");
await client.connect();
console.log("Applying supabase/setup.sql (migrations + seed)…");
try {
  await client.query(sql);
  console.log("✓ Database schema + seed applied successfully.");
} catch (err) {
  console.error("✗ Failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
