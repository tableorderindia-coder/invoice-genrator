#!/usr/bin/env node
/**
 * One-off cleanup: migrate-supabase-to-neon.cjs (before the fix in commit
 * fe96b06) duplicated rows in tables with no primary key on repeat runs
 * across Codespace sessions - the migration_audit_*_20260704 tables
 * specifically. This removes exact-duplicate rows from the given tables,
 * keeping one copy of each, using a ctid self-join (the standard technique
 * for a table with no unique key to dedupe against).
 *
 * Usage:
 *   TARGET_DATABASE_URL="postgresql://neondb_owner:PASSWORD@...neon.tech/neondb?sslmode=require" \
 *   node scripts/dedupe-audit-tables.cjs
 */

const { Client } = require("pg");

const TARGET_URL = process.env.TARGET_DATABASE_URL;
if (!TARGET_URL) {
  console.error("Set TARGET_DATABASE_URL first.");
  process.exit(1);
}

// The specific tables the row-count report flagged as exactly 2x source.
const TABLES = [
  "migration_audit_cashflow_monthly_usd_20260704",
  "migration_audit_employee_monthly_usd_20260704",
  "migration_audit_employee_payout_monthly_usd_20260704",
];

async function main() {
  const target = new Client({ connectionString: TARGET_URL });
  await target.connect();

  try {
    for (const table of TABLES) {
      const { rows: before } = await target.query(`select count(*)::int as n from public.${table}`);
      const { rowCount: deleted } = await target.query(`
        delete from public.${table} a
        using public.${table} b
        where a.ctid < b.ctid and a.* = b.*
      `);
      const { rows: after } = await target.query(`select count(*)::int as n from public.${table}`);
      console.log(
        `${table}: ${before[0].n} rows -> deleted ${deleted} duplicate(s) -> ${after[0].n} rows remaining`,
      );
    }
  } finally {
    await target.end();
  }
}

main().catch((err) => {
  console.error("Dedup failed:", err);
  process.exit(1);
});
