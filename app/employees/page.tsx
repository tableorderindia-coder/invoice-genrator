import Link from "next/link";

import { Shell } from "../_components/shell";
import { GlassPanel } from "../_components/glass-panel";
import { Field, inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { StaggerGrid } from "../_components/stagger-grid";
import { requirePageAccess } from "@/lib/auth/server";
import { createEmployeeAction, updateEmployeeAction } from "@/src/features/billing/actions";
import { getPnDashboardData, listCompanies, listEmployees } from "@/src/features/billing/store";
import { buildWhatsAppHref } from "@/src/features/billing/employee-contact";
import { resolveSelectedCompanyId } from "@/src/features/billing/filter-selection";
import {
  formatInr,
  formatRate,
  formatSignedInr,
  formatUsd,
  formatWholeRateInput,
} from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    companyId?: string | string[];
    employeeId?: string | string[];
  }>;
}) {
  await requirePageAccess("employees");
  const resolvedSearchParams = await searchParams;
  const companies = await listCompanies();
  const selectedCompanyId = resolveSelectedCompanyId({
    companyId: resolvedSearchParams.companyId,
    companies,
  });
  const [employees, pnDashboardData] = selectedCompanyId
    ? await Promise.all([
        listEmployees(selectedCompanyId),
        getPnDashboardData({ companyId: selectedCompanyId, periodType: "monthly" }),
      ])
    : [[], null];
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);

  const employeeProfitMap = new Map(
    (pnDashboardData?.employeeEditableSections ?? []).map((section) => [
      section.employeeId,
      section.totalNetProfitInrCents,
    ]),
  );
  const tab = Array.isArray(resolvedSearchParams.tab)
    ? resolvedSearchParams.tab[0]
    : resolvedSearchParams.tab;
  const activeTab = tab === "edit" ? "edit" : "add";
  const selectedEmployeeIdRaw = Array.isArray(resolvedSearchParams.employeeId)
    ? resolvedSearchParams.employeeId[0]
    : resolvedSearchParams.employeeId;
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeIdRaw) ?? employees[0];
  const companyQuery = selectedCompanyId
    ? `companyId=${encodeURIComponent(selectedCompanyId)}`
    : "";
  const addHref = companyQuery ? `/employees?tab=add&${companyQuery}` : "/employees?tab=add";
  const editHref = companyQuery ? `/employees?tab=edit&${companyQuery}` : "/employees?tab=edit";

  return (
    <Shell title="Employees" eyebrow="Defaults for billing">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <GlassPanel gradient>
          <div className="flex items-center gap-2">
            <Link href={addHref} className={activeTab === "add" ? "gradient-btn" : "btn-outline"}>
              Add employee
            </Link>
            <Link href={editHref} className={activeTab === "edit" ? "gradient-btn" : "btn-outline"}>
              Edit employee
            </Link>
          </div>

          <form action="/employees" className="mt-5 flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value={activeTab} />
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

          {activeTab === "add" ? (
            <form action={createEmployeeAction}>
              <h2 className="mt-4 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Add employee
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Company">
                  <select name="companyId" required className={inputClass} defaultValue={selectedCompanyId}>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Name">
                  <input name="fullName" required className={inputClass} placeholder="Jane Doe" />
                </Field>
                <Field label="Phone number">
                  <input name="phoneNumber" type="tel" className={inputClass} placeholder="+91 98765 43210" />
                </Field>
                <Field label="Designation">
                  <input name="designation" required className={inputClass} placeholder="Senior Engineer" />
                </Field>
                <Field label="Default team">
                  <input name="defaultTeam" required className={inputClass} placeholder="Data Engineering" />
                </Field>
                <Field label="Billing rate (USD/hr)">
                  <input name="billingRateUsd" type="number" min="0" step="0.01" required className={inputClass} placeholder="0.00" />
                </Field>
                <Field label="Peg rate">
                  <input name="defaultPaidUsdInrRate" type="number" min="0" step="1" className={inputClass} placeholder="0" defaultValue="0" />
                </Field>
                <Field label="Actual paid (INR)">
                  <input name="defaultActualPaidInr" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" defaultValue="0" />
                </Field>
                <Field label="PF (INR)">
                  <input name="defaultPfInr" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" defaultValue="0" />
                </Field>
                <Field label="TDS (INR)">
                  <input name="defaultTdsInr" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" defaultValue="0" />
                </Field>
                <Field label="Hrs per week">
                  <input name="hrsPerWeek" type="number" min="0" step="0.01" required className={inputClass} placeholder="40" />
                </Field>
                <Field label="Active from">
                  <input name="activeFrom" type="date" required className={inputClass} />
                </Field>
                <Field label="Active to">
                  <input name="activeTo" type="date" className={inputClass} />
                </Field>
              </div>
              <PendingSubmitButton
                className="gradient-btn mt-5"
                defaultText="Save employee"
                pendingText="Saving..."
              />
            </form>
          ) : (
            <>
              <h2 className="mt-4 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Edit employee
              </h2>
              <div className="mt-4">
                <form action="/employees" className="flex items-end gap-2">
                  <input type="hidden" name="tab" value="edit" />
                  <input type="hidden" name="companyId" value={selectedCompanyId} />
                  <Field label="Select employee">
                    <select
                      name="employeeId"
                      className={inputClass}
                      defaultValue={selectedEmployee?.id}
                    >
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.fullName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <PendingSubmitButton
                    className="btn-outline"
                    defaultText="Load"
                    pendingText="Loading..."
                  />
                </form>
              </div>
              <form action={updateEmployeeAction}>
                {selectedEmployee ? <input type="hidden" name="employeeId" value={selectedEmployee.id} /> : null}
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Company">
                    <select name="companyId" required className={inputClass} defaultValue={selectedEmployee?.companyId}>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Name">
                    <input name="fullName" required className={inputClass} defaultValue={selectedEmployee?.fullName} />
                  </Field>
                  <Field label="Phone number">
                    <input name="phoneNumber" type="tel" className={inputClass} defaultValue={selectedEmployee?.phoneNumber ?? ""} />
                  </Field>
                  <Field label="Designation">
                    <input name="designation" required className={inputClass} defaultValue={selectedEmployee?.designation} />
                  </Field>
                  <Field label="Default team">
                    <input name="defaultTeam" required className={inputClass} defaultValue={selectedEmployee?.defaultTeam} />
                  </Field>
                  <Field label="Billing rate (USD/hr)">
                    <input name="billingRateUsd" type="number" min="0" step="0.01" required className={inputClass} defaultValue={selectedEmployee ? (selectedEmployee.billingRateUsdCents / 100).toFixed(2) : ""} />
                  </Field>
                  <Field label="Peg rate">
                    <input name="defaultPaidUsdInrRate" type="number" min="0" step="1" className={inputClass} defaultValue={formatWholeRateInput(selectedEmployee?.defaultPaidUsdInrRate)} />
                  </Field>
                  <Field label="Actual paid (INR)">
                    <input name="defaultActualPaidInr" type="number" min="0" step="0.01" className={inputClass} defaultValue={selectedEmployee ? (selectedEmployee.defaultActualPaidInrCents / 100).toFixed(2) : "0"} />
                  </Field>
                  <Field label="PF (INR)">
                    <input name="defaultPfInr" type="number" min="0" step="0.01" className={inputClass} defaultValue={selectedEmployee ? (selectedEmployee.defaultPfInrCents / 100).toFixed(2) : "0"} />
                  </Field>
                  <Field label="TDS (INR)">
                    <input name="defaultTdsInr" type="number" min="0" step="0.01" className={inputClass} defaultValue={selectedEmployee ? (selectedEmployee.defaultTdsInrCents / 100).toFixed(2) : "0"} />
                  </Field>
                  <Field label="Hrs per week">
                    <input name="hrsPerWeek" type="number" min="0" step="0.01" required className={inputClass} defaultValue={selectedEmployee?.hrsPerWeek} />
                  </Field>
                  <Field label="Active from">
                    <input name="activeFrom" type="date" required className={inputClass} defaultValue={selectedEmployee?.activeFrom} />
                  </Field>
                  <Field label="Active to">
                    <input name="activeTo" type="date" className={inputClass} defaultValue={selectedEmployee?.activeTo} />
                  </Field>
                  <Field label="Is active">
                    <select name="isActive" className={inputClass} defaultValue={selectedEmployee?.isActive ? "true" : "false"}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </Field>
                </div>
                <PendingSubmitButton
                  className="gradient-btn mt-5"
                  defaultText="Update employee"
                  pendingText="Updating..."
                  disabled={!selectedEmployee}
                />
              </form>
            </>
          )}
        </GlassPanel>

        <GlassPanel gradient>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Employee defaults
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {selectedCompany ? selectedCompany.name : "No company selected"}
          </p>
          <StaggerGrid className="mt-5 space-y-4">
            {employees.map((employee) => {
              const profit = employeeProfitMap.get(employee.id) ?? 0;
              const profitColor = profit === 0 ? "var(--text-primary)" : (profit > 0 ? "#6ee7b7" : "#fca5a5");
              const whatsappHref = buildWhatsAppHref(employee.phoneNumber);
              return (
              <div
                key={employee.id}
                className="stagger-item glass-card p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {employee.fullName}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {employee.designation}
                    </p>
                  </div>
                  <div className="text-right text-sm shrink-0" style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                    <p style={{ color: "var(--text-accent)" }}>
                      {formatUsd(employee.billingRateUsdCents)}
                      <span className="text-xs ml-1 font-sans" style={{ color: "var(--text-muted)" }}>billed</span>
                    </p>
                    <p style={{ color: "var(--text-accent)" }}>
                      {formatRate(employee.defaultPaidUsdInrRate)}
                      <span className="text-xs ml-1 font-sans" style={{ color: "var(--text-muted)" }}>peg rate</span>
                    </p>
                    <p className="mt-1 font-semibold" style={{ color: profitColor }}>
                      {formatSignedInr(profit)}
                      <span className="text-[10px] ml-1 uppercase tracking-wider font-sans" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Net P/L (INR)</span>
                    </p>
                  </div>
                </div>
                {employee.phoneNumber ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span style={{ color: "var(--text-muted)" }}>Phone</span>
                    <span
                      className="font-medium"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                      }}
                    >
                      {employee.phoneNumber}
                    </span>
                    {whatsappHref ? (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline px-3 py-1 text-xs"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "var(--text-accent)",
                      border: "1px solid rgba(99,102,241,0.15)",
                    }}
                  >
                    {employee.defaultTeam}
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    {employee.hrsPerWeek} hrs/week
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    Paid {formatInr(employee.defaultActualPaidInrCents)}
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    PF {formatInr(employee.defaultPfInrCents)}
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    TDS {formatInr(employee.defaultTdsInrCents)}
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    Active from {employee.activeFrom}
                  </span>
                </div>
              </div>
            )})}
            {employees.length === 0 && (
              <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                No employees added yet.
              </p>
            )}
          </StaggerGrid>
        </GlassPanel>
      </section>
    </Shell>
  );
}
