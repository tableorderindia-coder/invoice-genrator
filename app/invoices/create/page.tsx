import { Shell } from "../../_components/shell";
import { GlassPanel } from "../../_components/glass-panel";
import { Field, inputClass } from "../../_components/field";
import { createInvoiceDraftAction } from "@/src/features/billing/actions";
import { findLatestInvoiceForCompany, listCompanies } from "@/src/features/billing/store";

export const dynamic = "force-dynamic";

export default async function CreateInvoicePage() {
  const companies = await listCompanies();
  const latestInvoices = await Promise.all(
    companies.map(async (company) => ({
      company,
      previous: await findLatestInvoiceForCompany(company.id),
    })),
  );

  return (
    <Shell title="Create invoice" eyebrow="Billing workflow">
      <GlassPanel gradient>
        <form action={createInvoiceDraftAction}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Company">
              <select name="companyId" required className={inputClass}>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Month">
              <input name="month" type="number" min="1" max="12" defaultValue="4" required className={inputClass} />
            </Field>
            <Field label="Year">
              <input name="year" type="number" defaultValue="2026" required className={inputClass} />
            </Field>
            <Field label="Invoice number">
              <input name="invoiceNumber" required className={inputClass} placeholder="INV-2026-001" />
            </Field>
            <Field label="Billing date">
              <input name="billingDate" type="date" required className={inputClass} />
            </Field>
            <Field label="Due date">
              <input name="dueDate" type="date" required className={inputClass} />
            </Field>
            <Field label="Duplicate from previous invoice">
              <select name="duplicateSourceId" className={inputClass}>
                <option value="">Start empty</option>
                {latestInvoices.flatMap(({ company, previous }) => {
                  return previous ? (
                    <option key={previous.id} value={previous.id}>
                      {company.name} · {previous.invoiceNumber}
                    </option>
                  ) : [];
                })}
              </select>
            </Field>
          </div>
          <button type="submit" className="gradient-btn mt-6">
            Create draft
          </button>
        </form>
      </GlassPanel>
    </Shell>
  );
}
