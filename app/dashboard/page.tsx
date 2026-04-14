import { GlassPanel } from "../_components/glass-panel";
import { Shell } from "../_components/shell";
import { inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { ChecklistFilterDropdown } from "../_components/checklist-filter-dropdown";
import {
  updateDashboardEmployeeCashFlowEntryAction,
} from "@/src/features/billing/actions";
import {
  buildDashboardFilterFieldEntries,
  formatPaymentMonthLabel,
  normalizeMultiSelectValue,
} from "@/src/features/billing/filter-selection";
import {
  getPnDashboardData,
  listCompanies,
  listEmployees,
  listAvailablePaymentMonths,
} from "@/src/features/billing/store";
import type { PnDashboardData } from "@/src/features/billing/types";
import { DashboardTables } from "./dashboard-tables";

export const dynamic = "force-dynamic";

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
    allMonths?: string | string[];
    paymentMonths?: string | string[];
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
  const selectedEmployeeIds = normalizeMultiSelectValue(resolved.employeeIds);

  const [employees, availableMonths] = selectedCompanyId 
    ? await Promise.all([listEmployees(selectedCompanyId), listAvailablePaymentMonths(selectedCompanyId)])
    : [[], []];

  const effectiveEmployeeIds =
    allEmployeesSelected || selectedEmployeeIds.length === 0
      ? employees.map((employee) => employee.id)
      : selectedEmployeeIds;

  const allMonthsValue = Array.isArray(resolved.allMonths)
    ? resolved.allMonths[0]
    : resolved.allMonths;
  const allMonthsSelected = allMonthsValue === "1";
  const selectedPaymentMonths = normalizeMultiSelectValue(resolved.paymentMonths);

  const effectivePaymentMonths =
    allMonthsSelected || selectedPaymentMonths.length === 0
      ? availableMonths
      : selectedPaymentMonths;

  const allEffectiveEmployeeIdsSelected =
    employees.length > 0 && effectiveEmployeeIds.length === employees.length;
  const allEffectivePaymentMonthsSelected =
    availableMonths.length > 0 &&
    effectivePaymentMonths.length === availableMonths.length;

  const dashboardFilterFields = buildDashboardFilterFieldEntries({
    companyId: selectedCompanyId,
    periodType,
    view,
    employeeIds: effectiveEmployeeIds,
    paymentMonths: effectivePaymentMonths,
    allEmployees: allEffectiveEmployeeIdsSelected,
    allMonths: allEffectivePaymentMonthsSelected,
  });

  const dashboardSwitchFields = buildDashboardFilterFieldEntries({
    companyId: selectedCompanyId,
    periodType,
    view,
    employeeIds: effectiveEmployeeIds,
    paymentMonths: effectivePaymentMonths,
    allEmployees: allEffectiveEmployeeIdsSelected,
    allMonths: allEffectivePaymentMonthsSelected,
    includeView: false,
  });

  const employeeFilterFields = buildDashboardFilterFieldEntries({
    companyId: selectedCompanyId,
    periodType,
    view,
    allEmployees: allEffectiveEmployeeIdsSelected,
    allMonths: allEffectivePaymentMonthsSelected,
    includeEmployeeIds: false,
    includePaymentMonths: false,
    includeAllEmployees: false,
    includeAllMonths: false,
  });

  const periodFilterFields = buildDashboardFilterFieldEntries({
    companyId: selectedCompanyId,
    periodType,
    view,
    allEmployees: allEffectiveEmployeeIdsSelected,
    allMonths: allEffectivePaymentMonthsSelected,
    includePeriodType: false,
    includeEmployeeIds: false,
    includePaymentMonths: false,
    includeAllEmployees: false,
    includeAllMonths: false,
  });

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
        paymentMonths: effectivePaymentMonths,
      })
    : emptyDashboardData;

  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;
  const filterParams = new URLSearchParams();
  for (const field of dashboardFilterFields) {
    filterParams.append(field.name, field.value);
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
          {dashboardSwitchFields.map((field, index) => (
            <input
              key={`${field.name}-${field.value}-${index}`}
              type="hidden"
              name={field.name}
              value={field.value}
            />
          ))}
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
          <form action="/dashboard" className="mb-4 space-y-4">
            {employeeFilterFields.map((field, index) => (
              <input
                key={`${field.name}-${field.value}-${index}`}
                type="hidden"
                name={field.name}
                value={field.value}
              />
            ))}
            <div className="flex flex-wrap gap-3">
              <ChecklistFilterDropdown
                name="employeeIds"
                label="Employee"
                options={employees.map((employee) => ({
                  value: employee.id,
                  label: employee.fullName,
                }))}
                defaultSelectedValues={effectiveEmployeeIds}
                includeSelectAll
              />
              <ChecklistFilterDropdown
                name="paymentMonths"
                label="Payment month"
                options={availableMonths.map((month) => ({
                  value: month,
                  label: formatPaymentMonthLabel(month),
                }))}
                defaultSelectedValues={effectivePaymentMonths}
                includeSelectAll
              />
            </div>
            <PendingSubmitButton
              className="btn-outline"
              defaultText="Apply filters"
              pendingText="Applying..."
            />
          </form>
          <DashboardTables
            view="employee"
            periodType={periodType}
            data={data}
            selectedCompanyId={selectedCompanyId}
            returnTo={returnTo}
            updateDashboardEmployeeCashFlowEntryAction={
              updateDashboardEmployeeCashFlowEntryAction
            }
          />
        </GlassPanel>
      ) : (
        <GlassPanel title="Monthly / Yearly" gradient>
          <form action="/dashboard" className="mb-4 space-y-4">
            {periodFilterFields.map((field, index) => (
              <input
                key={`${field.name}-${field.value}-${index}`}
                type="hidden"
                name={field.name}
                value={field.value}
              />
            ))}
            <div className="flex flex-wrap gap-3">
              <ChecklistFilterDropdown
                name="employeeIds"
                label="Employee"
                options={employees.map((employee) => ({
                  value: employee.id,
                  label: employee.fullName,
                }))}
                defaultSelectedValues={effectiveEmployeeIds}
                includeSelectAll
              />
              <ChecklistFilterDropdown
                name="paymentMonths"
                label="Payment month"
                options={availableMonths.map((month) => ({
                  value: month,
                  label: formatPaymentMonthLabel(month),
                }))}
                defaultSelectedValues={effectivePaymentMonths}
                includeSelectAll
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </form>
          <DashboardTables
            view="period"
            periodType={periodType}
            data={data}
            selectedCompanyId={selectedCompanyId}
            returnTo={returnTo}
            updateDashboardEmployeeCashFlowEntryAction={
              updateDashboardEmployeeCashFlowEntryAction
            }
          />
        </GlassPanel>
      )}
      <GlassPanel>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Gross Earnings (INR) = Commission Earned (INR) + FX Commission (INR). Net P/L in
          Monthly / Yearly view includes Employee Cash Flow net profit, and optionally
          company-level reimbursements and expenses (use headers toggles to include/exclude them).
        </p>
      </GlassPanel>
    </Shell>
  );
}
