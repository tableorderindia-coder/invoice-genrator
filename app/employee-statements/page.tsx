import { ChecklistFilterDropdown } from "../_components/checklist-filter-dropdown";
import { GlassPanel } from "../_components/glass-panel";
import { inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { Shell } from "../_components/shell";
import EmployeeStatementEditor from "./_components/employee-statement-editor";
import {
  listEmployeeStatementSections,
  parseEmployeeStatementFilters,
} from "@/src/features/billing/employee-statements";
import { listCompanies, listEmployees, listInvoicesForCompany } from "@/src/features/billing/store";
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
    employeeIds?: string | string[];
    startMonth?: string | string[];
    endMonth?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const resolved = await searchParams;
  const filters = parseEmployeeStatementFilters(resolved);
  const companies = await listCompanies();
  const selectedCompanyId = filters.companyId || companies[0]?.id || "";
  const employees = selectedCompanyId ? await listEmployees(selectedCompanyId) : [];
  const invoices = selectedCompanyId ? await listInvoicesForCompany(selectedCompanyId) : [];
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
    selectedCompanyId && startMonth && endMonth
      ? await listEmployeeStatementSections({
          companyId: selectedCompanyId,
          employeeIds: filters.employeeIds.length > 0 ? filters.employeeIds : undefined,
          startMonth,
          endMonth,
        })
      : [];
  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;
  const companyName =
    companies.find((company) => company.id === selectedCompanyId)?.name || "Unknown company";
  const generatedDate = formatDate(new Date());
  const returnTo = `/employee-statements?companyId=${encodeURIComponent(
    selectedCompanyId,
  )}&startMonth=${encodeURIComponent(startMonth)}&endMonth=${encodeURIComponent(
    endMonth,
  )}${selectedEmployeeIds.map((employeeId) => `&employeeIds=${encodeURIComponent(employeeId)}`).join("")}`;

  return (
    <Shell title="Employee Statements" eyebrow="Editable employee statement ledger">
      <GlassPanel gradient className="overflow-visible">
        <form
          action="/employee-statements"
          className="grid gap-3 md:grid-cols-[1.2fr_1.4fr_180px_180px_auto] md:items-end"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Company
            </span>
            <select name="companyId" defaultValue={selectedCompanyId} className={inputClass}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>

          <ChecklistFilterDropdown
            name="employeeIds"
            label="employee"
            options={employees.map((employee) => ({
              value: employee.id,
              label: employee.fullName,
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
            {sections.map((section) => (
              <EmployeeStatementEditor
                key={section.employeeId}
                companyId={selectedCompanyId}
                companyName={companyName}
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
