import { GlassPanel } from "../_components/glass-panel";
import { Shell } from "../_components/shell";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { ChecklistFilterDropdown } from "../_components/checklist-filter-dropdown";
import {
  filterCompaniesForAuthContext,
} from "@/src/features/billing/company-access";
import { requirePageAccess } from "@/lib/auth/server";
import {
  updateDashboardEmployeeCashFlowEntryAction,
} from "../../src/features/billing/actions";
import { employeeStatusLabel } from "../../src/features/billing/employee-status";
import {
  buildDashboardFilterFieldEntries,
  formatPaymentMonthLabel,
  normalizeMultiSelectValue,
  resolveDashboardColumnSelection,
  resolveSelectedCompanyIds,
} from "../../src/features/billing/filter-selection";
import {
  EMPLOYEE_DASHBOARD_COLUMN_OPTIONS,
  PERIOD_DASHBOARD_COLUMN_OPTIONS,
} from "../../src/features/billing/dashboard-column-options";
import {
  listCachedAvailablePaymentMonthsForCompanies,
  listCachedCompanies,
  listCachedEmployeesForCompanies,
} from "../../src/features/billing/cached-store";
import { getPnDashboardSummaryData } from "../../src/features/billing/pn-summary-store";
import type { PnDashboardData, PnPeriodRow } from "../../src/features/billing/types";
import { DashboardTables } from "./dashboard-tables";

export const dynamic = "force-dynamic";

function weightedRate(rows: PnPeriodRow[], rateKey: "cashoutUsdInrRate" | "paidUsdInrRate") {
  const eligibleRows = rateKey === "paidUsdInrRate"
    ? rows.filter((row) => row.paidUsdInrRate > 0)
    : rows;
  const totalWeight = eligibleRows.reduce(
    (sum, row) => sum + row.effectiveDollarInwardUsdCents,
    0,
  );
  if (totalWeight <= 0) return 0;
  return (
    eligibleRows.reduce(
      (sum, row) => sum + row[rateKey] * row.effectiveDollarInwardUsdCents,
      0,
    ) / totalWeight
  );
}

function mergePeriodRows(rows: PnPeriodRow[]): PnPeriodRow[] {
  const grouped = new Map<string, PnPeriodRow[]>();
  for (const row of rows) {
    const key = row.fiscalLabel ?? `${row.year}-${String(row.month ?? 0).padStart(2, "0")}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return [...grouped.values()]
    .map((bucket) => {
      const first = bucket[0];
      const sum = (pick: (row: PnPeriodRow) => number) =>
        bucket.reduce((total, row) => total + pick(row), 0);
      const reimbursementLabelsText = [
        ...new Set(
          bucket
            .flatMap((row) => row.reimbursementLabelsText.split(","))
            .map((label) => label.trim())
            .filter(Boolean),
        ),
      ].join(", ");

      return {
        year: first.year,
        month: first.month,
        fiscalLabel: first.fiscalLabel,
        dollarInwardUsdCents: sum((row) => row.dollarInwardUsdCents),
        onboardingAdvanceUsdCents: sum((row) => row.onboardingAdvanceUsdCents),
        reimbursementUsdCents: sum((row) => row.reimbursementUsdCents),
        reimbursementLabelsText,
        reimbursementInrCents: sum((row) => row.reimbursementInrCents),
        appraisalAdvanceUsdCents: sum((row) => row.appraisalAdvanceUsdCents),
        appraisalAdvanceInrCents: sum((row) => row.appraisalAdvanceInrCents),
        offboardingDeductionUsdCents: sum((row) => row.offboardingDeductionUsdCents),
        effectiveDollarInwardUsdCents: sum((row) => row.effectiveDollarInwardUsdCents),
        cashoutUsdInrRate: weightedRate(bucket, "cashoutUsdInrRate"),
        cashInInrCents: sum((row) => row.cashInInrCents),
        paidUsdInrRate: weightedRate(bucket, "paidUsdInrRate"),
        monthlyPaidInrCents: sum((row) => row.monthlyPaidInrCents),
        pfInrCents: sum((row) => row.pfInrCents),
        tdsInrCents: sum((row) => row.tdsInrCents),
        actualPaidInrCents: sum((row) => row.actualPaidInrCents),
        salaryPaidInrCents: sum((row) => row.salaryPaidInrCents),
        fxCommissionInrCents: sum((row) => row.fxCommissionInrCents),
        totalCommissionUsdCents: sum((row) => row.totalCommissionUsdCents),
        commissionEarnedInrCents: sum((row) => row.commissionEarnedInrCents),
        grossEarningsInrCents: sum((row) => row.grossEarningsInrCents),
        expensesInrCents: sum((row) => row.expensesInrCents),
        companyReimbursementUsdCents: sum((row) => row.companyReimbursementUsdCents),
        companyReimbursementInrCents: sum((row) => row.companyReimbursementInrCents),
        netPlInrCents: sum((row) => row.netPlInrCents),
      };
    })
    .sort(
      (left, right) =>
        left.year * 100 + (left.month ?? 0) - (right.year * 100 + (right.month ?? 0)),
    );
}

function mergeDashboardData(companyIds: string[], data: PnDashboardData[]): PnDashboardData {
  return {
    companyId: companyIds.join(","),
    employeeEditableSections: data.flatMap((item) => item.employeeEditableSections),
    employeeSections: data.flatMap((item) => item.employeeSections),
    periodRows: mergePeriodRows(data.flatMap((item) => item.periodRows)),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    companyIds?: string | string[];
    employeeIds?: string | string[];
    allEmployees?: string | string[];
    periodType?: string | string[];
    view?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
    allMonths?: string | string[];
    paymentMonths?: string | string[];
    employeeColumns?: string | string[];
    periodColumns?: string | string[];
  }>;
}) {
  const context = await requirePageAccess("dashboard");
  const resolved = await searchParams;
  const companies = filterCompaniesForAuthContext(await listCachedCompanies(), context);
  const selectedCompanyIds = resolveSelectedCompanyIds({
    companyIds: resolved.companyIds,
    companyId: resolved.companyId,
    companies,
  });
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

  const employees = await listCachedEmployeesForCompanies(selectedCompanyIds);
  const employeeCompanyMap = new Map(
    employees.map((employee) => [employee.id, employee.companyId] as const),
  );
  const availableMonths = await listCachedAvailablePaymentMonthsForCompanies(selectedCompanyIds);

  const effectiveEmployeeIds =
    allEmployeesSelected || selectedEmployeeIds.length === 0
      ? employees.map((employee) => employee.id)
      : selectedEmployeeIds;
  const employeeFilterActive = !allEmployeesSelected && selectedEmployeeIds.length > 0;

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
  const employeeColumnKeys = resolveDashboardColumnSelection({
    selectedColumns: resolved.employeeColumns,
    allowedColumns: EMPLOYEE_DASHBOARD_COLUMN_OPTIONS.map((option) => option.value),
  });
  const periodColumnKeys = resolveDashboardColumnSelection({
    selectedColumns: resolved.periodColumns,
    allowedColumns: PERIOD_DASHBOARD_COLUMN_OPTIONS.map((option) => option.value),
  });

  const dashboardFilterFields = buildDashboardFilterFieldEntries({
    companyIds: selectedCompanyIds,
    periodType,
    view,
    employeeIds: effectiveEmployeeIds,
    paymentMonths: effectivePaymentMonths,
    allEmployees: allEffectiveEmployeeIdsSelected,
    allMonths: allEffectivePaymentMonthsSelected,
    employeeColumns: employeeColumnKeys,
    periodColumns: periodColumnKeys,
  });

  const dashboardSwitchFields = buildDashboardFilterFieldEntries({
    companyIds: selectedCompanyIds,
    periodType,
    view,
    employeeIds: effectiveEmployeeIds,
    paymentMonths: effectivePaymentMonths,
    allEmployees: allEffectiveEmployeeIdsSelected,
    allMonths: allEffectivePaymentMonthsSelected,
    employeeColumns: employeeColumnKeys,
    periodColumns: periodColumnKeys,
    includeView: false,
  });

  const employeeFilterFields = buildDashboardFilterFieldEntries({
    companyIds: selectedCompanyIds,
    periodType,
    view,
    allEmployees: allEffectiveEmployeeIdsSelected,
    allMonths: allEffectivePaymentMonthsSelected,
    employeeColumns: employeeColumnKeys,
    periodColumns: periodColumnKeys,
    includeEmployeeIds: false,
    includePaymentMonths: false,
    includeAllEmployees: false,
    includeAllMonths: false,
    includeEmployeeColumns: false,
  });

  const periodFilterFields = buildDashboardFilterFieldEntries({
    companyIds: selectedCompanyIds,
    periodType,
    view,
    allEmployees: allEffectiveEmployeeIdsSelected,
    allMonths: allEffectivePaymentMonthsSelected,
    employeeColumns: employeeColumnKeys,
    periodColumns: periodColumnKeys,
    includeEmployeeIds: false,
    includePaymentMonths: false,
    includeAllEmployees: false,
    includeAllMonths: false,
    includePeriodColumns: false,
  });

  const periodTypeSwitchFields = buildDashboardFilterFieldEntries({
    companyIds: selectedCompanyIds,
    periodType,
    view,
    employeeIds: effectiveEmployeeIds,
    paymentMonths: effectivePaymentMonths,
    allEmployees: allEffectiveEmployeeIdsSelected,
    allMonths: allEffectivePaymentMonthsSelected,
    employeeColumns: employeeColumnKeys,
    periodColumns: periodColumnKeys,
    includePeriodType: false,
  });

  const emptyDashboardData: PnDashboardData = {
    companyId: "",
    employeeEditableSections: [],
    employeeSections: [],
    periodRows: [],
  };

  const data = selectedCompanyIds.length > 0
    ? mergeDashboardData(
        selectedCompanyIds,
        await Promise.all(
          selectedCompanyIds.map((companyId) => {
            const companyEmployeeIds = effectiveEmployeeIds.filter(
              (employeeId) => employeeCompanyMap.get(employeeId) === companyId,
            );
            return getPnDashboardSummaryData({
              companyId,
              periodType,
              employeeIds: employeeFilterActive
                ? companyEmployeeIds.length > 0
                  ? companyEmployeeIds
                  : ["__none__"]
                : undefined,
              paymentMonths: effectivePaymentMonths,
            });
          }),
        ),
      )
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
    <Shell
      title="P/L Dashboard"
      eyebrow="Company profitability"
      companyOptions={companies.map((company) => ({ id: company.id, name: company.name }))}
      activeCompanyIds={selectedCompanyIds}
    >
      {flashMessage ? (
        <GlassPanel gradient className="overflow-visible">
          <div
            className="rounded-2xl px-4 py-3 text-sm font-medium"
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
        </GlassPanel>
      ) : null}

      <GlassPanel gradient className="overflow-visible">
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
        <GlassPanel title="Employee" gradient className="overflow-visible">
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
                  label: employeeStatusLabel(employee),
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
              <ChecklistFilterDropdown
                name="employeeColumns"
                label="Columns"
                options={EMPLOYEE_DASHBOARD_COLUMN_OPTIONS}
                defaultSelectedValues={employeeColumnKeys}
                includeSelectAll
              />
            </div>
            <PendingSubmitButton
              className="btn-outline"
              defaultText="Load"
              pendingText="Loading..."
            />
          </form>
          <DashboardTables
            view="employee"
            periodType={periodType}
            data={data}
            returnTo={returnTo}
            employeeColumnKeys={employeeColumnKeys}
            periodColumnKeys={periodColumnKeys}
            updateDashboardEmployeeCashFlowEntryAction={
              updateDashboardEmployeeCashFlowEntryAction
            }
          />
        </GlassPanel>
      ) : (
        <GlassPanel title="Monthly / Yearly" gradient className="overflow-visible">
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
                  label: employeeStatusLabel(employee),
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
              <ChecklistFilterDropdown
                name="periodColumns"
                label="Columns"
                options={PERIOD_DASHBOARD_COLUMN_OPTIONS}
                defaultSelectedValues={periodColumnKeys}
                includeSelectAll
              />
            </div>
            <PendingSubmitButton
              className="btn-outline"
              defaultText="Load"
              pendingText="Loading..."
            />
          </form>
          <form action="/dashboard" className="mb-4 flex flex-wrap items-center gap-2">
            {periodTypeSwitchFields.map((field, index) => (
              <input
                key={`${field.name}-${field.value}-${index}`}
                type="hidden"
                name={field.name}
                value={field.value}
              />
            ))}
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
            returnTo={returnTo}
            employeeColumnKeys={employeeColumnKeys}
            periodColumnKeys={periodColumnKeys}
            updateDashboardEmployeeCashFlowEntryAction={
              updateDashboardEmployeeCashFlowEntryAction
            }
          />
        </GlassPanel>
      )}
      <GlassPanel>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Total earning (INR) = Operating margin (INR) + Forex gain (INR). Net P/L in
          Monthly / Yearly view includes Employee Cash Flow net profit, and optionally
          company-level reimbursements and expenses (use headers toggles to include/exclude them).
        </p>
      </GlassPanel>
    </Shell>
  );
}
