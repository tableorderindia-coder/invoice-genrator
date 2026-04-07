import type { ReactNode } from "react";

import { Shell } from "../_components/shell";
import { createCompanyAction } from "@/src/features/billing/actions";
import { listCompanies } from "@/src/features/billing/store";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <Shell title="Companies" eyebrow="Master data">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form action={createCompanyAction} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold">Add company</h2>
          <div className="mt-5 space-y-4">
            <Field label="Company name">
              <input name="name" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
            <Field label="Billing address">
              <textarea name="billingAddress" required rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
            <Field label="Default note">
              <textarea name="defaultNote" required rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
          </div>
          <button className="mt-5 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
            Save company
          </button>
        </form>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold">Company roster</h2>
          <div className="mt-5 space-y-4">
            {companies.map((company) => (
              <div key={company.id} className="rounded-3xl border border-slate-200 p-4">
                <p className="font-semibold">{company.name}</p>
                <p className="mt-2 text-sm text-slate-600">{company.billingAddress}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
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
