import { redirect } from "next/navigation";

import { requirePageAccess } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function LegacyNewInvoicePage() {
  await requirePageAccess("invoices");
  redirect("/invoices/create");
}
