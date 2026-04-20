import { redirect } from "next/navigation";

import { requirePageAccess } from "@/lib/auth/server";
import { getInvoiceDetail } from "@/src/features/billing/store";

export const dynamic = "force-dynamic";

export default async function LegacyInvoiceRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ teamId?: string | string[] }>;
}) {
  await requirePageAccess("invoices");
  const { id } = await params;
  const { teamId } = await searchParams;
  const detail = await getInvoiceDetail(id);

  if (!detail) {
    redirect("/invoices");
  }

  const requestedTeamId = Array.isArray(teamId) ? teamId[0] : teamId;
  redirect(
    requestedTeamId
      ? `/invoices/drafts/${id}?teamId=${requestedTeamId}`
      : `/invoices/drafts/${id}`,
  );
}
