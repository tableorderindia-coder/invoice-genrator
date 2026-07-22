import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes('relation "public.portal_company_snapshots" does not exist') ||
    message.includes("Could not find the table 'public.portal_company_snapshots'")
  );
}

function isSnapshotWriteDeniedError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    code === "42501" ||
    message.includes("row-level security policy") ||
    message.includes("permission denied")
  );
}

async function getSupabaseOrThrow() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

export async function getOrBuildPortalSnapshot<T>(input: {
  key: PortalSnapshotKey;
  build: () => Promise<T>;
}): Promise<T> {
  const supabase = await getSupabaseOrThrow();
  const { key } = input;

  const { data, error } = await supabase
    .from("portal_company_snapshots")
    .select("payload_json")
    .eq("company_id", key.companyId)
    .eq("snapshot_type", key.snapshotType)
    .eq("month_key", key.monthKey)
    .maybeSingle();

  if (error && !isMissingSnapshotTableError(error)) {
    throw error;
  }

  if (data && !error) {
    return data.payload_json as T;
  }

  const payload = await input.build();
  if (error && isMissingSnapshotTableError(error)) {
    return payload;
  }

  const { error: upsertError } = await supabase
    .from("portal_company_snapshots")
    .upsert(
      {
        company_id: key.companyId,
        snapshot_type: key.snapshotType,
        month_key: key.monthKey,
        payload_json: payload,
        source_version: new Date().toISOString(),
        rebuilt_at: new Date().toISOString(),
      },
      { onConflict: "company_id,snapshot_type,month_key" },
    );

  if (
    upsertError &&
    !isMissingSnapshotTableError(upsertError) &&
    !isSnapshotWriteDeniedError(upsertError)
  ) {
    throw upsertError;
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
  const supabase = await getSupabaseOrThrow();
  const snapshotTypes = snapshotTypesForInvalidation(input);
  const companyId = "companyId" in input ? input.companyId : undefined;
  const companyIds = [companyId, GLOBAL_COMPANY_ID].filter(Boolean) as string[];

  let query = supabase
    .from("portal_company_snapshots")
    .delete()
    .in("snapshot_type", snapshotTypes);

  if (companyIds.length > 0) {
    query = query.in("company_id", companyIds);
  }

  const { error } = await query;
  if (error && !isMissingSnapshotTableError(error) && !isSnapshotWriteDeniedError(error)) {
    throw error;
  }
}
