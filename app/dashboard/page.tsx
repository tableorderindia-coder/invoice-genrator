import { GlassPanel } from "../_components/glass-panel";
import { Shell } from "../_components/shell";
import { inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import {
  saveDashboardExpenseAction,
  updateDashboardEmployeeCashFlowEntryAction,
} from "@/src/features/billing/actions";
import {
  getPnDashboardData,
  listCompanies,
  listEmployees,
} from "@/src/features/billing/store";
import type { PnDashboardData } from "@/src/features/billing/types";
import { DashboardTables } from "./dashboard-tables";

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
        <form
          action="/dashboard"
          className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"
        >
          <label className="block">
            <span
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
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
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
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
            <label
              className="inline-flex items-center gap-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <input
                type="checkbox"
                name="allEmployees"
                value="1"
                defaultChecked={allEmployeesSelected}
              />
              Select all employees
            </label>
            <PendingSubmitButton
              className="btn-outline"
              defaultText="Apply employee filter"
              pendingText="Applying..."
            />
          </form>
          <DashboardTables
            view="employee"
            periodType={periodType}
            data={data}
            selectedCompanyId={selectedCompanyId}
            returnTo={returnTo}
            saveDashboardExpenseAction={saveDashboardExpenseAction}
            updateDashboardEmployeeCashFlowEntryAction={
              updateDashboardEmployeeCashFlowEntryAction
            }
          />
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
          <DashboardTables
            view="period"
            periodType={periodType}
            data={data}
            selectedCompanyId={selectedCompanyId}
            returnTo={returnTo}
            saveDashboardExpenseAction={saveDashboardExpenseAction}
            updateDashboardEmployeeCashFlowEntryAction={
              updateDashboardEmployeeCashFlowEntryAction
            }
          />
        </GlassPanel>
      )}
      <GlassPanel>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Gross Earnings (INR) = Commission Earned (INR) + FX Commission (INR). Net P/L in
          Monthly / Yearly view uses Employee Cash Flow net profit, plus reimbursements and
          appraisal advances converted to INR, minus dashboard expenses.
        </p>
      </GlassPanel>
    </Shell>
  );
}
