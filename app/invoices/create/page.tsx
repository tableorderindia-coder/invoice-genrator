import { Shell } from "../../_components/shell";
import { GlassPanel } from "../../_components/glass-panel";
import { Field, inputClass } from "../../_components/field";
import { PendingSubmitButton } from "../../_components/pending-submit-button";
import { requirePageAccess } from "@/lib/auth/server";
import { createInvoiceDraftAction } from "@/src/features/billing/actions";
import { CreateInvoiceForm } from "./create-invoice-form";
import { CreateInvoiceSubmitButton } from "./submit-button";
import { resolveSelectedCompanyId } from "@/src/features/billing/filter-selection";
import {
  listAvailableTeamNames,
  listCompanies,
  listInvoicesForCompany,
} from "@/src/features/billing/store";

export const dynamic = "force-dynamic";

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  await requirePageAccess("invoices");
  const companies = await listCompanies();
  const resolvedSearchParams = await searchParams;
  const selectedCompanyId = resolveSelectedCompanyId({
    companyId: resolvedSearchParams.companyId,
    companies,
  });
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const flashStatus = Array.isArray(resolvedSearchParams.flashStatus)
    ? resolvedSearchParams.flashStatus[0]
    : resolvedSearchParams.flashStatus;
  const flashMessage = Array.isArray(resolvedSearchParams.flashMessage)
    ? resolvedSearchParams.flashMessage[0]
    : resolvedSearchParams.flashMessage;
  const [previousInvoices, availableTeamNames] = selectedCompanyId
    ? await Promise.all([
        listInvoicesForCompany(selectedCompanyId),
        listAvailableTeamNames(selectedCompanyId),
      ])
    : [[], []];
  const availableTeamNamesByCompany = selectedCompanyId
    ? { [selectedCompanyId]: availableTeamNames }
    : {};

  return (
    <Shell title="Create invoice" eyebrow="Billing workflow">
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
        <form action="/invoices/create" className="mb-5 flex flex-wrap items-end gap-3">
          <Field label="Filter company">
            <select name="companyId" className={inputClass} defaultValue={selectedCompanyId}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
          <PendingSubmitButton
            className="btn-outline"
            defaultText="Load company"
            pendingText="Loading..."
          />
        </form>
        <form action={createInvoiceDraftAction}>
          <CreateInvoiceForm
            initialCompanyId={selectedCompanyId}
            companies={(selectedCompany ? [selectedCompany] : []).map((company) => ({
              id: company.id,
              name: company.name,
            }))}
            previousInvoices={previousInvoices.map((invoice) => ({
              companyId: selectedCompanyId,
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
