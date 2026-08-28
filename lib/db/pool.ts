import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Single pooled connection to Neon (or any Postgres), reused across
// requests within one server process. In Next.js dev, HMR would otherwise
// re-run this module and open a new pool on every edit, so it's cached on
// `global` the same way Prisma's docs recommend. In serverless (Vercel), a
// warm lambda instance reuses the pool across invocations; a cold start
// creates a fresh one.
const globalForPool = global as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  return new Pool({
    connectionString,
    // Neon's pooler endpoint (the connection string already points at
    // one - see deploy/vercel/env.production.example) does its own
    // connection multiplexing, so this can stay small; it just bounds
    // how many concurrent queries one server process can have in flight.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): Pool | null {
  if (!globalForPool.pgPool) {
    globalForPool.pgPool = createPool() ?? undefined;
  }
  return globalForPool.pgPool ?? null;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Run a single query against the pool. Throws if DATABASE_URL isn't set -
 * callers that need to degrade gracefully (like the old
 * getSupabaseServerCredentials() null-check pattern) should check
 * isDatabaseConfigured() first.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number | null }> {
  const pool = getPool();
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }
  const result = await pool.query<T>(text, params);
  return { rows: result.rows, rowCount: result.rowCount };
}

/**
 * Run a series of queries as a single transaction. `fn` receives a client
 * bound to that transaction - use it (not the pool-level `query`) for every
 * statement that needs to be atomic with the others.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {
      // Connection may already be broken - nothing more we can do.
    });
    throw err;
  } finally {
    client.release();
  }
}
