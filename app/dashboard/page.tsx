import { GlassPanel } from "../_components/glass-panel";
import { Shell } from "../_components/shell";
import { inputClass } from "../_components/field";
import { PendingActionButton } from "../_components/pending-action-button";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import {
  saveDashboardExpenseAction,
  updateEmployeePayoutAction,
} from "@/src/features/billing/actions";
import {
  getPnDashboardData,
  listCompanies,
  listEmployees,
} from "@/src/features/billing/store";
import type { PnDashboardData } from "@/src/features/billing/types";
import { formatInr, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

function normalizeStringArray(value?: string | string[]) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value.includes(",")) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [value];
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    employeeIds?: string | string[];
    allEmployees?: string | string[];
    periodType?: string | string[];
    view?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const resolved = await searchParams;
  const companies = await listCompanies();
  const selectedCompanyIdRaw = Array.isArray(resolved.companyId)
    ? resolved.companyId[0]
    : resolved.companyId;
  const selectedCompanyId = selectedCompanyIdRaw || companies[0]?.id || "";
  const selectedPeriodTypeRaw = Array.isArray(resolved.periodType)
    ? resolved.periodType[0]
    : resolved.periodType;
  const periodType = selectedPeriodTypeRaw === "yearly" ? "yearly" : "monthly";
  const selectedViewRaw = Array.isArray(resolved.view)
    ? resolved.view[0]
    : resolved.view;
  const view = selectedViewRaw === "period" ? "period" : "employee";
  const allEmployeesValue = Array.isArray(resolved.allEmployees)
    ? resolved.allEmployees[0]
    : resolved.allEmployees;
  const allEmployeesSelected = allEmployeesValue === "1";
  const selectedEmployeeIds = normalizeStringArray(resolved.employeeIds);

  const employees = selectedCompanyId ? await listEmployees(selectedCompanyId) : [];
  const effectiveEmployeeIds =
    allEmployeesSelected || selectedEmployeeIds.length === 0
      ? employees.map((employee) => employee.id)
      : selectedEmployeeIds;

  const emptyDashboardData: PnDashboardData = {
    companyId: "",
    employeeEditableSections: [],
    employeeSections: [],
    periodRows: [],
  };

  const data = selectedCompanyId
    ? await getPnDashboardData({
        companyId: selectedCompanyId,
        periodType,
        employeeIds: effectiveEmployeeIds,
      })
    : emptyDashboardData;

  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;
  const filterParams = new URLSearchParams();
  if (selectedCompanyId) filterParams.set("companyId", selectedCompanyId);
  if (periodType) filterParams.set("periodType", periodType);
  filterParams.set("view", view);
  if (allEmployeesSelected) filterParams.set("allEmployees", "1");
  for (const employeeId of effectiveEmployeeIds) {
    filterParams.append("employeeIds", employeeId);
  }
  const returnTo = `/dashboard?${filterParams.toString()}`;

  return (
    <Shell title="P/N Dashboard" eyebrow="Company profitability">
      <GlassPanel gradient>
        <form action="/dashboard" className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Select company
            </span>
            <select
              name="companyId"
              defaultValue={selectedCompanyId}
              className={inputClass}
              style={{
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
              }}
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <input type="hidden" name="periodType" value={periodType} />
            <input type="hidden" name="view" value={view} />
            <PendingSubmitButton
              className="gradient-btn"
              defaultText="Load company"
              pendingText="Loading..."
            />
          </div>
        </form>
        {flashMessage ? (
          <div
            className="mt-4 rounded-2xl px-4 py-3 text-sm font-medium"
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
      </GlassPanel>

      <GlassPanel gradient>
        <form action="/dashboard" className="mb-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="companyId" value={selectedCompanyId} />
          <input type="hidden" name="periodType" value={periodType} />
          {effectiveEmployeeIds.map((employeeId) => (
            <input key={employeeId} type="hidden" name="employeeIds" value={employeeId} />
          ))}
          {allEmployeesSelected ? <input type="hidden" name="allEmployees" value="1" /> : null}
          <PendingSubmitButton
            name="view"
            value="employee"
            className={view === "employee" ? "gradient-btn" : "btn-outline"}
            defaultText="Employee"
            pendingText="Loading view..."
          />
          <PendingSubmitButton
            name="view"
            value="period"
            className={view === "period" ? "gradient-btn" : "btn-outline"}
            defaultText="Monthly / Yearly"
            pendingText="Loading view..."
          />
        </form>
      </GlassPanel>

      {view === "employee" ? (
        <GlassPanel title="Employee" gradient>
          <form action="/dashboard" className="mb-4 space-y-3">
            <input type="hidden" name="companyId" value={selectedCompanyId} />
            <input type="hidden" name="periodType" value={periodType} />
            <input type="hidden" name="view" value={view} />
            <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Employees (select one or more)
            </label>
            <select
              name="employeeIds"
              multiple
              defaultValue={effectiveEmployeeIds}
              className={inputClass}
              style={{
                minHeight: "180px",
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
              }}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <input type="checkbox" name="allEmployees" value="1" defaultChecked={allEmployeesSelected} />
              Select all employees
            </label>
            <PendingSubmitButton
              className="btn-outline"
              defaultText="Apply employee filter"
              pendingText="Applying..."
            />
          </form>

          <div className="space-y-6">
            {data.employeeEditableSections.map((section) => (
              <div
                key={section.employeeId}
                className="rounded-2xl p-4"
                style={{ border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}
              >
                <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {section.employeeName}
                </h3>
                <div className="mt-3 overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Invoice</th>
                        <th>Days worked</th>
                        <th>Dollar inward</th>
                        <th>Monthly $</th>
                        <th>Cashout rate</th>
                        <th>Paid rate</th>
                        <th>PF (INR)</th>
                        <th>TDS (INR)</th>
                        <th>Actual paid (INR)</th>
                        <th>FX commission (INR)</th>
                        <th>Total commission (USD)</th>
                        <th>Commission earned (INR)</th>
                        <th>Gross earnings (INR)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={row.payoutId}>
                          <td>{formatMonthYear(row.month, row.year)}</td>
                          <td>{row.invoiceNumber}</td>
                          <td>{`${row.daysWorked}/${row.daysInMonth}`}</td>
                          <td>
                            <form id={`dashboard-payout-${row.payoutId}`} action={updateEmployeePayoutAction}></form>
                            <input type="hidden" form={`dashboard-payout-${row.payoutId}`} name="payoutId" value={row.payoutId} />
                            <input type="hidden" form={`dashboard-payout-${row.payoutId}`} name="returnTo" value={returnTo} />
                            <input
                              form={`dashboard-payout-${row.payoutId}`}
                              type="number"
                              name="dollarInwardUsd"
                              min="0"
                              step="0.01"
                              defaultValue={(row.dollarInwardUsdCents / 100).toFixed(2)}
                              className={inputClass}
                              style={{ minWidth: "8rem", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}
                            />
                          </td>
                          <td>
                            <input
                              form={`dashboard-payout-${row.payoutId}`}
                              type="number"
                              name="employeeMonthlyUsd"
                              min="0.01"
                              step="0.01"
                              defaultValue={(row.employeeMonthlyUsdCents / 100).toFixed(2)}
                              className={inputClass}
                              style={{ minWidth: "8rem", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}
                            />
                          </td>
                          <td>
                            <input
                              form={`dashboard-payout-${row.payoutId}`}
                              type="number"
                              name="cashoutUsdInrRate"
                              min="0"
                              step="0.0001"
                              defaultValue={row.cashoutUsdInrRate.toFixed(4)}
                              className={inputClass}
                              style={{ minWidth: "7rem", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}
                            />
                          </td>
                          <td>
                            {row.isSecurityDepositMonth ? (
                              <>
                                <input
                                  type="hidden"
                                  form={`dashboard-payout-${row.payoutId}`}
                                  name="paidUsdInrRate"
                                  value="0"
                                />
                                <span style={{ color: "var(--text-muted)" }}>-</span>
                              </>
                            ) : (
                              <input
                                form={`dashboard-payout-${row.payoutId}`}
                                type="number"
                                name="paidUsdInrRate"
                                min="0"
                                step="0.0001"
                                defaultValue={row.paidUsdInrRate.toFixed(4)}
                                className={inputClass}
                                style={{ minWidth: "7rem", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}
                              />
                            )}
                          </td>
                          <td>
                            <input
                              form={`dashboard-payout-${row.payoutId}`}
                              type="number"
                              name="pfInr"
                              min="0"
                              step="0.01"
                              defaultValue={(row.pfInrCents / 100).toFixed(2)}
                              className={inputClass}
                              style={{ minWidth: "8rem", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}
                            />
                          </td>
                          <td>
                            <input
                              form={`dashboard-payout-${row.payoutId}`}
                              type="number"
                              name="tdsInr"
                              min="0"
                              step="0.01"
                              defaultValue={(row.tdsInrCents / 100).toFixed(2)}
                              className={inputClass}
                              style={{ minWidth: "8rem", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}
                            />
                          </td>
                          <td>
                            <input
                              form={`dashboard-payout-${row.payoutId}`}
                              type="number"
                              name="actualPaidInr"
                              min="0"
                              step="0.01"
                              defaultValue={(row.actualPaidInrCents / 100).toFixed(2)}
                              className={inputClass}
                              style={{ minWidth: "8rem", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}
                            />
                          </td>
                          <td>{formatInr(row.fxCommissionInrCents)}</td>
                          <td>{formatUsd(row.totalCommissionUsdCents)}</td>
                          <td>{formatInr(row.commissionEarnedInrCents)}</td>
                          <td>{formatInr(row.grossEarningsInrCents)}</td>
                          <td>
                            <PendingActionButton
                              form={`dashboard-payout-${row.payoutId}`}
                              className="btn-outline"
                              defaultText="Update"
                              pendingText="Updating..."
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Total Gross Earning: {formatInr(section.totalGrossEarningsInrCents)}
                </p>
              </div>
            ))}
            {data.employeeEditableSections.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No payout records found for selected filters.
              </p>
            ) : null}
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel title="Monthly / Yearly" gradient>
          <form action="/dashboard" className="mb-4 flex flex-wrap items-center gap-2">
            <input type="hidden" name="companyId" value={selectedCompanyId} />
            <input type="hidden" name="view" value={view} />
            {effectiveEmployeeIds.map((employeeId) => (
              <input key={employeeId} type="hidden" name="employeeIds" value={employeeId} />
            ))}
            {allEmployeesSelected ? <input type="hidden" name="allEmployees" value="1" /> : null}
            <PendingSubmitButton
              name="periodType"
              value="monthly"
              className={periodType === "monthly" ? "gradient-btn" : "btn-outline"}
              defaultText="Monthly"
              pendingText="Loading period..."
            />
            <PendingSubmitButton
              name="periodType"
              value="yearly"
              className={periodType === "yearly" ? "gradient-btn" : "btn-outline"}
              defaultText="Yearly"
              pendingText="Loading period..."
            />
          </form>

          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Days worked</th>
                  <th>Dollar inward</th>
                  <th>Monthly $</th>
                  <th>PF (INR)</th>
                  <th>TDS (INR)</th>
                  <th>Actual paid (INR)</th>
                  <th>FX commission (INR)</th>
                  <th>Total commission (USD)</th>
                  <th>Commission earned (INR)</th>
                  <th>Gross earnings (INR)</th>
                  <th>Expenses (INR)</th>
                  <th>Net P/L (INR)</th>
                </tr>
              </thead>
              <tbody>
                {data.periodRows.map((row) => {
                  const periodLabel =
                    periodType === "monthly"
                      ? formatMonthYear(row.month ?? 1, row.year)
                      : String(row.year);
                  return (
                    <tr key={`${row.year}-${row.month ?? 0}`}>
                      <td>{periodLabel}</td>
                      <td>{`${row.daysWorked}/${row.daysInMonth}`}</td>
                      <td>{formatUsd(row.dollarInwardUsdCents)}</td>
                      <td>{formatUsd(row.employeeMonthlyUsdCents)}</td>
                      <td>{formatInr(row.pfInrCents)}</td>
                      <td>{formatInr(row.tdsInrCents)}</td>
                      <td>{formatInr(row.actualPaidInrCents)}</td>
                      <td>{formatInr(row.fxCommissionInrCents)}</td>
                      <td>{formatUsd(row.totalCommissionUsdCents)}</td>
                      <td>{formatInr(row.commissionEarnedInrCents)}</td>
                      <td>{formatInr(row.grossEarningsInrCents)}</td>
                      <td>
                        <form action={saveDashboardExpenseAction} className="flex items-center gap-2">
                          <input type="hidden" name="companyId" value={selectedCompanyId} />
                          <input type="hidden" name="periodType" value={periodType} />
                          <input type="hidden" name="year" value={row.year} />
                          {periodType === "monthly" ? (
                            <input type="hidden" name="month" value={row.month} />
                          ) : null}
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input
                            type="number"
                            name="amountInr"
                            min="0"
                            step="0.01"
                            defaultValue={(row.expensesInrCents / 100).toFixed(2)}
                            className={inputClass}
                            style={{
                              minWidth: "7rem",
                              border: "1px solid var(--glass-border)",
                              background: "rgba(255,255,255,0.04)",
                              color: "var(--text-primary)",
                            }}
                          />
                          <PendingSubmitButton
                            className="btn-outline"
                            defaultText="Save"
                            pendingText="Saving..."
                          />
                        </form>
                      </td>
                      <td>{formatInr(row.netPlInrCents)}</td>
                    </tr>
                  );
                })}
                {data.periodRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center" style={{ color: "var(--text-muted)" }}>
                      No period data available for selected filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}
      <GlassPanel>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Gross Earnings (INR) = Commission Earned (INR) + FX Commission (INR). Net P/L = Gross Earnings - Expenses.
        </p>
      </GlassPanel>
    </Shell>
  );
}
