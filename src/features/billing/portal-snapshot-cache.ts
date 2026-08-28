import { query } from "@/lib/db/pool";
import type { BillingInvalidationInput } from "./cache-tags";

export type PortalSnapshotType =
  | "companies"
  | "employees"
  | "employees-active"
  | "invoices"
  | "payment-months"
  | "salary-month"
  | "expenses"
  | "employee-cash-flow"
  | "employee-statements"
  | "founders-balance";

export type PortalSnapshotKey = {
  companyId: string;
  snapshotType: PortalSnapshotType;
  monthKey: string;
};

const GLOBAL_COMPANY_ID = "__global__";

export function buildPortalSnapshotKey(input: {
  companyId?: string;
  snapshotType: PortalSnapshotType;
  monthKey?: string;
}): PortalSnapshotKey {
  return {
    companyId: input.companyId || GLOBAL_COMPANY_ID,
    snapshotType: input.snapshotType,
    monthKey: input.monthKey || "",
  };
}

function isMissingSnapshotTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return (
    code === "42P01" ||
    message.includes('relation "public.portal_company_snapshots" does not exist') ||
    message.includes('relation "portal_company_snapshots" does not exist')
  );
}

function isSnapshotWriteDeniedError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return code === "42501" || message.includes("permission denied");
}

export async function getOrBuildPortalSnapshot<T>(input: {
  key: PortalSnapshotKey;
  build: () => Promise<T>;
}): Promise<T> {
  const { key } = input;
  let missingTable = false;

  try {
    const { rows } = await query<{ payload_json: T }>(
      `select payload_json
       from public.portal_company_snapshots
       where company_id = $1 and snapshot_type = $2 and month_key = $3
       limit 1`,
      [key.companyId, key.snapshotType, key.monthKey],
    );

    if (rows[0]) {
      return rows[0].payload_json;
    }
  } catch (error) {
    if (!isMissingSnapshotTableError(error)) {
      throw error;
    }
    missingTable = true;
  }

  const payload = await input.build();
  if (missingTable) {
    return payload;
  }

  try {
    await query(
      `insert into public.portal_company_snapshots
         (company_id, snapshot_type, month_key, payload_json, source_version, rebuilt_at)
       values ($1, $2, $3, $4, $5, $5)
       on conflict (company_id, snapshot_type, month_key)
       do update set
         payload_json = excluded.payload_json,
         source_version = excluded.source_version,
         rebuilt_at = excluded.rebuilt_at`,
      [
        key.companyId,
        key.snapshotType,
        key.monthKey,
        JSON.stringify(payload),
        new Date().toISOString(),
      ],
    );
  } catch (error) {
    if (!isMissingSnapshotTableError(error) && !isSnapshotWriteDeniedError(error)) {
      throw error;
    }
  }

  return payload;
}

function snapshotTypesForInvalidation(input: BillingInvalidationInput): PortalSnapshotType[] {
  switch (input.type) {
    case "employee":
      return [
        "employees",
        "employees-active",
        "salary-month",
        "invoices",
        "employee-cash-flow",
        "employee-statements",
      ];
    case "salary":
      return ["salary-month", "payment-months", "employee-cash-flow", "founders-balance"];
    case "cashflow":
      return [
        "payment-months",
        "employee-cash-flow",
        "employee-statements",
        "founders-balance",
      ];
    case "invoice":
      return ["invoices", "payment-months", "employee-cash-flow", "employee-statements"];
    case "expense":
      return ["expenses", "founders-balance"];
    case "company":
      return input.companyId
        ? ["companies", "employees", "employees-active", "invoices", "payment-months"]
        : ["companies"];
  }
}

export async function invalidatePortalSnapshotsForBilling(input: BillingInvalidationInput) {
  const snapshotTypes = snapshotTypesForInvalidation(input);
  const companyId = "companyId" in input ? input.companyId : undefined;
  const companyIds = [companyId, GLOBAL_COMPANY_ID].filter(Boolean) as string[];

  const conditions = ["snapshot_type = any($1::text[])"];
  const params: unknown[] = [snapshotTypes];

  if (companyIds.length > 0) {
    conditions.push(`company_id = any($${params.length + 1}::text[])`);
    params.push(companyIds);
  }

  try {
    await query(
      `delete from public.portal_company_snapshots where ${conditions.join(" and ")}`,
      params,
    );
  } catch (error) {
    if (!isMissingSnapshotTableError(error) && !isSnapshotWriteDeniedError(error)) {
      throw error;
    }
  }
}
