import { Shell } from "../../_components/shell";
import { GlassPanel } from "../../_components/glass-panel";
import { requirePageAccess } from "@/lib/auth/server";
import { filterCompaniesForAuthContext } from "@/src/features/billing/company-access";
import { createInvoiceDraftAction } from "@/src/features/billing/actions";
import { CreateInvoiceForm } from "./create-invoice-form";
import { CreateInvoiceSubmitButton } from "./submit-button";
import {
  listAvailableTeamNamesForCompanies,
  listCompanies,
  listInvoicesForCompanies,
} from "@/src/features/billing/store";

export const dynamic = "force-dynamic";

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const context = await requirePageAccess("invoices");
  const companies = filterCompaniesForAuthContext(await listCompanies(), context);
  const resolvedSearchParams = await searchParams;
  const flashStatus = Array.isArray(resolvedSearchParams.flashStatus)
    ? resolvedSearchParams.flashStatus[0]
    : resolvedSearchParams.flashStatus;
  const flashMessage = Array.isArray(resolvedSearchParams.flashMessage)
    ? resolvedSearchParams.flashMessage[0]
    : resolvedSearchParams.flashMessage;
  const companyIds = companies.map((company) => company.id);
  const [invoices, availableTeamNamesByCompany] = await Promise.all([
    listInvoicesForCompanies(companyIds),
    listAvailableTeamNamesForCompanies(companyIds),
  ]);

  return (
    <Shell
      title="Create invoice"
      eyebrow="Billing workflow"
      companyOptions={companies.map((company) => ({ id: company.id, name: company.name }))}
      activeCompanyId={companies[0]?.id}
      showCompanySelector={false}
    >
      <GlassPanel gradient>
        {flashMessage ? (
          <div
            className="mb-4 rounded-2xl px-4 py-3 text-sm font-medium"
            style={{
              background:
                flashStatus === "error"
                  ? "rgba(248, 113, 113, 0.08)"
                  : "rgba(16, 185, 129, 0.08)",
              border:
                flashStatus === "error"
                  ? "1px solid rgba(248, 113, 113, 0.25)"
                  : "1px solid rgba(16, 185, 129, 0.25)",
              color: flashStatus === "error" ? "#fca5a5" : "#6ee7b7",
            }}
          >
            {flashMessage}
          </div>
        ) : null}
        <form action={createInvoiceDraftAction}>
          <CreateInvoiceForm
            companies={companies.map((company) => ({
              id: company.id,
              name: company.name,
            }))}
            previousInvoices={invoices.map((invoice) => ({
                companyId: invoice.companyId,
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.status,
              }))}
            availableTeamNamesByCompany={availableTeamNamesByCompany}
          />
          <CreateInvoiceSubmitButton />
        </form>
      </GlassPanel>
    </Shell>
  );
}
