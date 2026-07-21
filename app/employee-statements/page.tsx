import { ChecklistFilterDropdown } from "../_components/checklist-filter-dropdown";
import { GlassPanel } from "../_components/glass-panel";
import { inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { Shell } from "../_components/shell";
import {
  filterCompaniesForAuthContext,
} from "@/src/features/billing/company-access";
import { employeeStatusLabel } from "@/src/features/billing/employee-status";
import { requirePageAccess } from "@/lib/auth/server";
import EmployeeStatementEditor from "./_components/employee-statement-editor";
import {
  parseEmployeeStatementFilters,
} from "@/src/features/billing/employee-statements";
import { listEmployeeStatementSections } from "@/src/features/billing/employee-statements-load";
import {
  listCompanies,
  listEmployeesForCompanies,
  listInvoicesForCompanies,
} from "@/src/features/billing/store";
import { resolveSelectedCompanyIds } from "@/src/features/billing/filter-selection";
import { formatDate } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

function getUniqueInvoiceMonths(months: string[]) {
  return [...new Set(months)].sort((left, right) => right.localeCompare(left));
}

export default async function EmployeeStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    companyIds?: string | string[];
    employeeIds?: string | string[];
    startMonth?: string | string[];
    endMonth?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const context = await requirePageAccess("employee-statements");
  const resolved = await searchParams;
  const filters = parseEmployeeStatementFilters(resolved);
  const companies = filterCompaniesForAuthContext(await listCompanies(), context);
  const selectedCompanyIds = resolveSelectedCompanyIds({
    companyIds: resolved.companyIds,
    companyId: filters.companyId,
    companies,
  });
  const [employees, invoices] = await Promise.all([
    listEmployeesForCompanies(selectedCompanyIds),
    listInvoicesForCompanies(selectedCompanyIds),
  ]);
  const availableMonths = getUniqueInvoiceMonths(
    invoices.map((invoice) => `${invoice.year}-${String(invoice.month).padStart(2, "0")}`),
  );
  const latestMonth = availableMonths[0] ?? "";
  const rawStartMonth = filters.startMonth || latestMonth;
  const rawEndMonth = filters.endMonth || latestMonth;
  const startMonth =
    rawStartMonth && rawEndMonth && rawStartMonth > rawEndMonth ? rawEndMonth : rawStartMonth;
  const endMonth =
    rawStartMonth && rawEndMonth && rawStartMonth > rawEndMonth ? rawStartMonth : rawEndMonth;
  const selectedEmployeeIds =
    filters.employeeIds.length > 0 ? filters.employeeIds : employees.map((employee) => employee.id);
  const sections =
    startMonth && endMonth
      ? (
          await Promise.all(
            selectedCompanyIds.map(async (companyId) => ({
              companyId,
              sections: await listEmployeeStatementSections({
                companyId,
                employeeIds: filters.employeeIds.length > 0 ? filters.employeeIds : undefined,
                startMonth,
                endMonth,
              }),
            })),
          )
        ).flatMap((bucket) =>
          bucket.sections.map((section) => ({
            companyId: bucket.companyId,
            section,
          })),
        )
      : [];
  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;
  const companyNameMap = new Map(companies.map((company) => [company.id, company.name]));
  const generatedDate = formatDate(new Date());
  const returnTo = `/employee-statements?${selectedCompanyIds
    .map((companyId) => `companyIds=${encodeURIComponent(companyId)}`)
    .join("&")}&startMonth=${encodeURIComponent(startMonth)}&endMonth=${encodeURIComponent(
    endMonth,
  )}${selectedEmployeeIds.map((employeeId) => `&employeeIds=${encodeURIComponent(employeeId)}`).join("")}`;

  return (
    <Shell
      title="Employee Statements"
      eyebrow="Editable employee statement ledger"
      companyOptions={companies.map((company) => ({ id: company.id, name: company.name }))}
      activeCompanyIds={selectedCompanyIds}
    >
      <GlassPanel gradient className="overflow-visible">
        <form
          action="/employee-statements"
          className="grid gap-3 md:grid-cols-[1.4fr_180px_180px_auto] md:items-end"
        >
          {selectedCompanyIds.map((companyId) => (
            <input key={companyId} type="hidden" name="companyIds" value={companyId} />
          ))}

          <ChecklistFilterDropdown
            name="employeeIds"
            label="employee"
            options={employees.map((employee) => ({
              value: employee.id,
              label: employeeStatusLabel(employee),
            }))}
            defaultSelectedValues={selectedEmployeeIds}
            includeSelectAll
          />

          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Start month
            </span>
            <input name="startMonth" type="month" defaultValue={startMonth} className={inputClass} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              End month
            </span>
            <input name="endMonth" type="month" defaultValue={endMonth} className={inputClass} />
          </label>

          <PendingSubmitButton
            className="gradient-btn"
            defaultText="Load"
            pendingText="Loading..."
          />
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

      <GlassPanel title="Statement Sections" gradient>
        {sections.length > 0 ? (
          <div className="space-y-8">
            {sections.map(({ companyId, section }) => (
              <EmployeeStatementEditor
                key={`${companyId}:${section.employeeId}`}
                companyId={companyId}
                companyName={companyNameMap.get(companyId) || "Unknown company"}
                section={section}
                startMonth={startMonth}
                endMonth={endMonth}
                generatedDate={generatedDate}
                returnTo={returnTo}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Select a company, one or more employees, and a month range to load invoice-based
            employee statements.
          </p>
        )}
      </GlassPanel>
    </Shell>
  );
}
