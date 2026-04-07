import type { ReactNode } from "react";

import { Shell } from "../../_components/shell";
import { createInvoiceDraftAction } from "@/src/features/billing/actions";
import { findLatestInvoiceForCompany, listCompanies } from "@/src/features/billing/store";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const companies = await listCompanies();
  const latestInvoices = await Promise.all(
    companies.map(async (company) => ({
      company,
      previous: await findLatestInvoiceForCompany(company.id),
    })),
  );

  return (
    <Shell title="Create invoice" eyebrow="Billing workflow">
      <form action={createInvoiceDraftAction} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Company">
            <select name="companyId" required className="w-full rounded-2xl border border-slate-200 px-4 py-3">
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Month">
            <input name="month" type="number" min="1" max="12" defaultValue="4" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </Field>
          <Field label="Year">
            <input name="year" type="number" defaultValue="2026" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </Field>
          <Field label="Invoice number">
            <input name="invoiceNumber" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </Field>
          <Field label="Billing date">
            <input name="billingDate" type="date" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </Field>
          <Field label="Due date">
            <input name="dueDate" type="date" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </Field>
          <Field label="Duplicate from previous invoice">
            <select name="duplicateSourceId" className="w-full rounded-2xl border border-slate-200 px-4 py-3">
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
        <button className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
          Create draft
        </button>
      </form>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
