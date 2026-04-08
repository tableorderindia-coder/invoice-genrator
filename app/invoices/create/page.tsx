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

export default async function CreateInvoicePage() {
  const companies = await listCompanies();
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
