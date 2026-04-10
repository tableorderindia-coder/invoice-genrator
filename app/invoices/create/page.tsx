import { Shell } from "../../_components/shell";
import { GlassPanel } from "../../_components/glass-panel";
import { createInvoiceDraftAction } from "@/src/features/billing/actions";
import { CreateInvoiceForm } from "./create-invoice-form";
import { CreateInvoiceSubmitButton } from "./submit-button";
import {
  findLatestInvoiceForCompany,
  listAvailableTeamNames,
  listCompanies,
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
  const companies = await listCompanies();
  const resolvedSearchParams = await searchParams;
  const flashStatus = Array.isArray(resolvedSearchParams.flashStatus)
    ? resolvedSearchParams.flashStatus[0]
    : resolvedSearchParams.flashStatus;
  const flashMessage = Array.isArray(resolvedSearchParams.flashMessage)
    ? resolvedSearchParams.flashMessage[0]
    : resolvedSearchParams.flashMessage;
  const latestInvoices = await Promise.all(
    companies.map(async (company) => ({
      company,
      previous: await findLatestInvoiceForCompany(company.id),
    })),
  );
  const teamCatalog = await Promise.all(
    companies.map(async (company) => ({
      companyId: company.id,
      teamNames: await listAvailableTeamNames(company.id),
    })),
  );
  const availableTeamNamesByCompany = Object.fromEntries(
    teamCatalog.map((item) => [item.companyId, item.teamNames]),
  );

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
        <form action={createInvoiceDraftAction}>
          <CreateInvoiceForm
            companies={companies.map((company) => ({
              id: company.id,
              name: company.name,
            }))}
            latestInvoices={latestInvoices.flatMap(({ company, previous }) =>
              previous
                ? [
                    {
                      companyId: company.id,
                      companyName: company.name,
                      invoiceId: previous.id,
                      invoiceNumber: previous.invoiceNumber,
                    },
                  ]
                : [],
            )}
            availableTeamNamesByCompany={availableTeamNamesByCompany}
          />
          <CreateInvoiceSubmitButton />
        </form>
      </GlassPanel>
    </Shell>
  );
}
