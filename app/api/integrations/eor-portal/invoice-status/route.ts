import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { InvoiceStatus } from "@/src/features/billing/types";

const allowedStatuses = new Set<InvoiceStatus>(["received"]);

export async function POST(request: Request) {
  const expectedSecret = process.env.INVOICE_GENERATOR_SYNC_SECRET ?? process.env.EOR_PORTAL_SYNC_SECRET;
  const providedSecret = request.headers.get("x-invoice-generator-sync-secret");

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized invoice status sync request." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const invoiceId = String(payload.externalInvoiceId ?? payload.invoiceId ?? "").trim();
    const status = String(payload.status ?? "").trim() as InvoiceStatus;

    if (!invoiceId) {
      throw new Error("Invoice id is required.");
    }
    if (!allowedStatuses.has(status)) {
      throw new Error("Only payment received status can be synced from EOR Portal.");
    }

    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      throw new Error("Supabase admin client is not configured.");
    }

    const { data: invoice, error } = await supabase
      .from("invoices")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .select("id, status")
      .single();
    if (error) throw error;

    return NextResponse.json({
      created: 0,
      updated: 1,
      skipped: 0,
      needsMapping: false,
      errors: [],
      invoice: { id: invoice.id, status: invoice.status },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice status sync failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
