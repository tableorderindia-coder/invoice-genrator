import { GlassPanel } from "../_components/glass-panel";
import { cookies } from "next/headers";
import { Shell } from "../_components/shell";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { ChecklistFilterDropdown } from "../_components/checklist-filter-dropdown";
import { AutoApplyFilterForm } from "../_components/auto-apply-filter-form";
import {
  filterCompaniesForAuthContext,
} from "@/src/features/billing/company-access";
import { requirePageAccess } from "@/lib/auth/server";
import {
  bulkUpdateDashboardEmployeeCashFlowEntriesAction,
  updateDashboardEmployeeCashFlowEntryAction,
} from "../../src/features/billing/actions";
import { employeeStatusLabel } from "../../src/features/billing/employee-status";
import {
  buildDashboardFilterFieldEntries,
  filterRowsByFinancialYear,
  formatPaymentMonthLabel,
  normalizeMultiSelectValue,
  parseFinancialYear,
  resolveDashboardColumnSelection,
  resolveSelectedCompanyIds,
} from "../../src/features/billing/filter-selection";
import {
  DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
  DEFAULT_PERIOD_DASHBOARD_COLUMNS,
  EMPLOYEE_DASHBOARD_COLUMN_OPTIONS,
  PERIOD_DASHBOARD_COLUMN_OPTIONS,
} from "../../src/features/billing/dashboard-column-options";
import {
  listCachedAvailablePaymentMonthsForCompanies,
  listCachedCompanies,
  listCachedEmployeesForCompanies,
} from "../../src/features/billing/cached-store";
import { getPnDashboardSummaryData } from "../../src/features/billing/pn-summary-store";
import { mergePnPeriodRows } from "../../src/features/billing/pn-dashboard";
import type { PnDashboardData } from "../../src/features/billing/types";
import { DashboardTables } from "./dashboard-tables";
import {
  normalizePortalUiMode,
  PORTAL_UI_MODE_COOKIE,
} from "../../src/features/ui/portal-ui-mode";

export const dynamic = "force-dynamic";

function mergeDashboardData(companyIds: string[], data: PnDashboardData[]): PnDashboardData {
  return {
    companyId: companyIds.join(","),
    employeeEditableSections: data.flatMap((item) => item.employeeEditableSections),
    employeeSections: data.flatMap((item) => item.employeeSections),
    periodRows: mergePnPeriodRows(data.flatMap((item) => item.periodRows)),
  };
}

function monthKeyToRow(value: string) {
  const [yearPart, monthPart] = value.split("-");
  return {
    value,
    year: Number.parseInt(yearPart ?? "", 10),
    month: Number.parseInt(monthPart ?? "", 10),
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
    financialYear?: string | string[];
  }>;
}) {
  const context = await requirePageAccess("dashboard");
  const cookieStore = await cookies();
  const uiMode = normalizePortalUiMode(cookieStore.get(PORTAL_UI_MODE_COOKIE)?.value);
  const resolved = await searchParams;
  const companies = filterCompaniesForAuthContext(await listCachedCompanies(), context);
  const selectedCompanyIds = resolveSelectedCompanyIds({
    companyIds: resolved.companyIds,
    companyId: resolved.companyId,
    companies,
  });
  const selectedFinancialYear = parseFinancialYear(
    Array.isArray(resolved.financialYear)
      ? resolved.financialYear[0]
      : resolved.financialYear,
  );
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
  const availableMonths = filterRowsByFinancialYear(
    (await listCachedAvailablePaymentMonthsForCompanies(selectedCompanyIds)).map(monthKeyToRow),
    selectedFinancialYear.value,
  )
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.month))
    .map((row) => row.value);

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
    defaultColumns: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
  });
  const periodColumnKeys = resolveDashboardColumnSelection({
    selectedColumns: resolved.periodColumns,
    allowedColumns: PERIOD_DASHBOARD_COLUMN_OPTIONS.map((option) => option.value),
    defaultColumns: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
  });

  const dashboardFilterFields = buildDashboardFilterFieldEntries({
    companyIds: selectedCompanyIds,
    financialYear: selectedFinancialYear.value,
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
    financialYear: selectedFinancialYear.value,
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
    financialYear: selectedFinancialYear.value,
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
    financialYear: selectedFinancialYear.value,
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
    financialYear: selectedFinancialYear.value,
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
  const dashboardEmployeeEditorKey = [
    "dashboard-employee",
    periodType,
    ...[...selectedCompanyIds].sort(),
    "employees",
    ...[...effectiveEmployeeIds].sort(),
    "months",
    ...[...effectivePaymentMonths].sort(),
  ].join(":");

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
  const buildExportHref = (input: { format: "csv" | "pdf"; scope?: "table" | "company" }) => {
    const params = new URLSearchParams();
    for (const field of dashboardFilterFields) {
      params.append(field.name, field.value);
    }
    params.set("format", input.format);
    if (input.scope) {
      params.set("scope", input.scope);
    }
    return `/api/dashboard/export?${params.toString()}`;
  };
  const tableCsvExportHref = buildExportHref({ format: "csv" });
  const tablePdfExportHref = buildExportHref({ format: "pdf" });
  const companyCsvExportHref = buildExportHref({ format: "csv", scope: "company" });
  const companyPdfExportHref = buildExportHref({ format: "pdf", scope: "company" });

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
          <AutoApplyFilterForm action="/dashboard" className="mb-4 space-y-4">
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
                autoApplyOnClose
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
                autoApplyOnClose
              />
              <ChecklistFilterDropdown
                name="employeeColumns"
                label="Columns"
                options={EMPLOYEE_DASHBOARD_COLUMN_OPTIONS}
                defaultSelectedValues={employeeColumnKeys}
                includeSelectAll
                emptyValue="__none__"
                autoApplyOnClose
              />
            </div>
          </AutoApplyFilterForm>
          <DashboardTables
            key={dashboardEmployeeEditorKey}
            view="employee"
            periodType={periodType}
            data={data}
            returnTo={returnTo}
            employeeColumnKeys={employeeColumnKeys}
            periodColumnKeys={periodColumnKeys}
            exportHrefs={{
              tableCsv: tableCsvExportHref,
              tablePdf: tablePdfExportHref,
              companyCsv: companyCsvExportHref,
              companyPdf: companyPdfExportHref,
            }}
            uiMode={uiMode}
            updateDashboardEmployeeCashFlowEntryAction={
              updateDashboardEmployeeCashFlowEntryAction
            }
            bulkUpdateDashboardEmployeeCashFlowEntriesAction={
              bulkUpdateDashboardEmployeeCashFlowEntriesAction
            }
          />
        </GlassPanel>
      ) : (
        <GlassPanel title="Monthly / Yearly" gradient className="overflow-visible">
          <AutoApplyFilterForm action="/dashboard" className="mb-4 space-y-4">
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
                autoApplyOnClose
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
                autoApplyOnClose
              />
              <ChecklistFilterDropdown
                name="periodColumns"
                label="Columns"
                options={PERIOD_DASHBOARD_COLUMN_OPTIONS}
                defaultSelectedValues={periodColumnKeys}
                includeSelectAll
                emptyValue="__none__"
                autoApplyOnClose
              />
            </div>
          </AutoApplyFilterForm>
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
            exportHrefs={{
              tableCsv: tableCsvExportHref,
              tablePdf: tablePdfExportHref,
              companyCsv: companyCsvExportHref,
              companyPdf: companyPdfExportHref,
            }}
            uiMode={uiMode}
            updateDashboardEmployeeCashFlowEntryAction={
              updateDashboardEmployeeCashFlowEntryAction
            }
            bulkUpdateDashboardEmployeeCashFlowEntriesAction={
              bulkUpdateDashboardEmployeeCashFlowEntriesAction
            }
          />
        </GlassPanel>
      )}
    </Shell>
  );
}
