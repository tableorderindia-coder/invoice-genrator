#!/usr/bin/env node
/**
 * One-shot data migration: Supabase Postgres -> Neon (or any plain Postgres).
 *
 * Run from an environment with real internet access (the Supabase and Neon
 * hosts are not reachable from the Claude cloud sandbox that authored this
 * script) - e.g. a GitHub Codespace on this repo.
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgresql://postgres.xxx:PASSWORD@...supabase.com:6543/postgres" \
 *   TARGET_DATABASE_URL="postgresql://neondb_owner:PASSWORD@...neon.tech/neondb?sslmode=require" \
 *   npm run migrate:supabase-to-neon
 *
 * What it does, in order:
 *   1. Applies supabase/schema.neon.sql to the target (idempotent - safe to
 *      re-run).
 *   2. Copies every public-schema business table from source -> target, in
 *      FK-safe order.
 *   3. Special-cases `profiles`: joins Supabase's `auth.users.encrypted_password`
 *      (a bcrypt hash) onto each profile row as `password_hash`, so existing
 *      users can log in with their EXISTING password after the cutover - no
 *      forced resets.
 *   4. Skips copying portal_company_snapshots rows (pure cache, safe to
 *      rebuild) but ensures the table exists.
 *   5. Prints a source-vs-target row-count report for every table and exits
 *      non-zero if anything doesn't match, so "no data loss" is something
 *      you can actually verify rather than take on faith.
 */

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_URL || !TARGET_URL) {
  console.error(
    "Set SOURCE_DATABASE_URL (Supabase) and TARGET_DATABASE_URL (Neon) env vars first.",
  );
  process.exit(1);
}

// FK-safe order, matches table declaration order in supabase/schema.sql.
const TABLES_IN_ORDER = [
  "companies",
  "profiles", // handled specially, see migrateProfiles()
  "permissions",
  "user_company_access",
  "employees",
  "teams",
  "invoices",
  "invoice_teams",
  "invoice_line_items",
  "invoice_adjustments",
  "invoice_realizations",
  "employee_payouts",
  "invoice_payments",
  "invoice_payment_employee_entries",
  "employee_salary_payments",
  "employee_salary_payment_audit",
  "employee_payslip_templates",
  "employee_payslips",
  "company_expenses",
  "founder_withdrawals",
  "employee_statement_invoice_rows",
  "employee_statement_month_summaries",
  "security_deposit_ledger",
];

const SKIP_DATA_COPY = new Set(["portal_company_snapshots"]); // cache, rebuilds on demand

async function applyTargetSchema(target) {
  const schemaPath = path.join(__dirname, "..", "supabase", "schema.neon.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  console.log("Applying supabase/schema.neon.sql to target...");
  await target.query(sql);
  console.log("Schema applied.\n");
}

async function getColumns(client, table) {
  const { rows } = await client.query(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = $1
     order by ordinal_position`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

async function copyTable(source, target, table) {
  const [sourceColumns, targetColumns] = await Promise.all([
    getColumns(source, table),
    getColumns(target, table),
  ]);
  const sourceSet = new Set(sourceColumns);
  const targetSet = new Set(targetColumns);
  const columns = targetColumns.filter((c) => sourceSet.has(c));

  const onlyInSource = sourceColumns.filter((c) => !targetSet.has(c));
  const onlyInTarget = targetColumns.filter((c) => !sourceSet.has(c));
  if (onlyInSource.length || onlyInTarget.length) {
    console.warn(
      `  WARNING: ${table} column mismatch between source and target ` +
        `(schema drift from supabase/schema.sql?). ` +
        `Only in source: [${onlyInSource.join(", ") || "-"}]. ` +
        `Only in target: [${onlyInTarget.join(", ") || "-"}]. ` +
        `Copying the ${columns.length} shared columns only.`,
    );
  }

  const quoted = columns.map((c) => `"${c}"`).join(", ");

  const { rows } = await source.query(`select ${quoted} from public.${table}`);
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows (nothing to copy)`);
    return { copied: 0 };
  }

  const BATCH_SIZE = 500;
  let copied = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const valuesSql = [];
    const params = [];
    batch.forEach((row, rowIdx) => {
      const placeholders = columns.map((_, colIdx) => {
        params.push(row[columns[colIdx]]);
        return `$${rowIdx * columns.length + colIdx + 1}`;
      });
      valuesSql.push(`(${placeholders.join(", ")})`);
    });

    await target.query(
      // OVERRIDING SYSTEM VALUE is required for tables with a GENERATED
      // ALWAYS AS IDENTITY column (e.g. permissions.id) so we can carry
      // over the original ids; it's a harmless no-op on every other table.
      `insert into public.${table} (${quoted})
       overriding system value
       values ${valuesSql.join(", ")}
       on conflict do nothing`,
      params,
    );
    copied += batch.length;
  }

  console.log(`  ${table}: copied ${copied} rows`);
  return { copied };
}

async function migrateProfiles(source, target) {
  const { rows: profiles } = await source.query(`
    select id, email, role, must_change_password,
           overview_exclude_onboarding_advance_from_net_pl, created_at
    from public.profiles
  `);
  const { rows: authUsers } = await source.query(`
    select id, encrypted_password from auth.users
  `);
  const passwordById = new Map(authUsers.map((u) => [u.id, u.encrypted_password]));

  let copied = 0;
  let missingPassword = 0;
  for (const p of profiles) {
    const passwordHash = passwordById.get(p.id);
    if (!passwordHash) {
      missingPassword += 1;
      console.warn(`  WARNING: no auth.users row for profile ${p.id} (${p.email}) - skipped`);
      continue;
    }
    await target.query(
      `insert into public.profiles
        (id, email, password_hash, role, must_change_password,
         overview_exclude_onboarding_advance_from_net_pl, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do nothing`,
      [
        p.id,
        p.email,
        passwordHash,
        p.role,
        p.must_change_password,
        p.overview_exclude_onboarding_advance_from_net_pl,
        p.created_at,
      ],
    );
    copied += 1;
  }

  console.log(
    `  profiles: copied ${copied} rows (with existing bcrypt password hashes carried over)` +
      (missingPassword ? `, ${missingPassword} skipped (no matching auth.users row)` : ""),
  );
  return { copied };
}

async function verifyRowCounts(source, target) {
  console.log("\nRow-count verification:");
  let allMatch = true;
  for (const table of [...TABLES_IN_ORDER, ...SKIP_DATA_COPY]) {
    const [{ rows: s }, { rows: t }] = await Promise.all([
      source.query(`select count(*)::int as n from public.${table}`).catch(() => ({ rows: [{ n: null }] })),
      target.query(`select count(*)::int as n from public.${table}`),
    ]);
    const sourceCount = s[0].n;
    const targetCount = t[0].n;
    const isSkipped = SKIP_DATA_COPY.has(table);
    const status = isSkipped
      ? "skipped (cache table)"
      : sourceCount === targetCount
        ? "OK"
        : "MISMATCH";
    if (!isSkipped && sourceCount !== targetCount) allMatch = false;
    console.log(
      `  ${table.padEnd(38)} source=${String(sourceCount).padStart(6)}  target=${String(targetCount).padStart(6)}  ${status}`,
    );
  }
  return allMatch;
}

async function main() {
  const source = new Client({ connectionString: SOURCE_URL });
  const target = new Client({ connectionString: TARGET_URL });

  await source.connect();
  await target.connect();
  console.log("Connected to source (Supabase) and target (Neon).\n");

  try {
    await applyTargetSchema(target);

    console.log("Copying tables...");
    for (const table of TABLES_IN_ORDER) {
      if (table === "profiles") {
        await migrateProfiles(source, target);
        continue;
      }
      await copyTable(source, target, table);
    }

    const allMatch = await verifyRowCounts(source, target);

    if (!allMatch) {
      console.error("\nRow counts do NOT all match. Investigate before cutting over.");
      process.exitCode = 1;
    } else {
      console.log("\nAll row counts match. Migration looks complete.");
    }
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
