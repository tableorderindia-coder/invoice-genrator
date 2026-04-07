import type { ReactNode } from "react";

import { Shell } from "../_components/shell";
import { createEmployeeAction } from "@/src/features/billing/actions";
import { listCompanies, listEmployees } from "@/src/features/billing/store";
import { formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const companies = await listCompanies();
  const employees = await listEmployees();

  return (
    <Shell title="Employees" eyebrow="Defaults for billing">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form action={createEmployeeAction} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold">Add employee</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Company">
              <select name="companyId" required className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Name">
              <input name="fullName" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
            <Field label="Designation">
              <input name="designation" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
            <Field label="Default team">
              <input name="defaultTeam" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
            <Field label="Billing rate (USD/hr)">
              <input name="billingRateUsd" type="number" min="0" step="0.01" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
            <Field label="Payout rate (USD/hr)">
              <input name="payoutRateUsd" type="number" min="0" step="0.01" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
            <Field label="Active from">
              <input name="activeFrom" type="date" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
            <Field label="Active to">
              <input name="activeTo" type="date" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </Field>
          </div>
          <button className="mt-5 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
            Save employee
          </button>
        </form>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold">Employee defaults</h2>
          <div className="mt-5 space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{employee.fullName}</p>
                    <p className="text-sm text-slate-500">{employee.designation}</p>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <p>{formatUsd(employee.billingRateUsdCents)} billed</p>
                    <p>{formatUsd(employee.payoutRateUsdCents)} payout</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{employee.defaultTeam}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">Active from {employee.activeFrom}</span>
                </div>
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
