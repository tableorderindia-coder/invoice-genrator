import { GlassPanel } from "@/app/_components/glass-panel";
import { Field, inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { Shell } from "@/app/_components/shell";
import { requirePageAccess } from "@/lib/auth/server";
import { filterCompaniesForAuthContext } from "@/src/features/billing/company-access";
import { resolveSelectedCompanyIds } from "@/src/features/billing/filter-selection";
import { listMonthlyPayrollRows } from "@/src/features/billing/payroll-store";
import { listPayslipRecords } from "@/src/features/billing/payslip-store";
import { listCompanies } from "@/src/features/billing/store";
import { formatMonthYear } from "@/src/features/billing/utils";
import { SalaryMonthEditor } from "./_components/salary-month-editor";
import { PayslipEditor } from "./_components/payslip-editor";

export const dynamic = "force-dynamic";

type SearchValue = string | string[] | undefined;

function firstSearchValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function currentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }
  return formatMonthYear(month, year);
}

export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: SearchValue;
    companyIds?: SearchValue;
    month?: SearchValue;
    tab?: SearchValue;
    flashStatus?: SearchValue;
    flashMessage?: SearchValue;
  }>;
}) {
  const context = await requirePageAccess("salary");
  const resolved = await searchParams;
  const companies = filterCompaniesForAuthContext(await listCompanies(), context);

  const selectedCompanyIds = resolveSelectedCompanyIds({
    companyIds: resolved.companyIds,
    companyId: resolved.companyId,
    companies,
  });
  const selectedCompanyId = selectedCompanyIds[0] ?? "";
  const singleCompanySelected = selectedCompanyIds.length === 1;
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const selectedMonth = firstSearchValue(resolved.month) || currentMonthKey();
  const selectedTab = firstSearchValue(resolved.tab) === "payslips" ? "payslips" : "sheet";
  const flashStatus = firstSearchValue(resolved.flashStatus);
  const flashMessage = firstSearchValue(resolved.flashMessage);
  const companyScopeParams = selectedCompanyIds
    .map((companyId) => `companyIds=${encodeURIComponent(companyId)}`)
    .join("&");
  const baseReturnTo = `/salary?${companyScopeParams}&month=${encodeURIComponent(selectedMonth)}`;
  const returnTo = selectedTab === "payslips" ? `${baseReturnTo}&tab=payslips` : baseReturnTo;
  const payrollRows = singleCompanySelected
    ? await listMonthlyPayrollRows({ companyId: selectedCompanyId, month: selectedMonth })
    : [];
  const payslips = singleCompanySelected
    ? await listPayslipRecords({ companyId: selectedCompanyId, month: selectedMonth })
    : [];
  const sheetHref = `${baseReturnTo}&tab=sheet`;
  const payslipsHref = `${baseReturnTo}&tab=payslips`;

  return (
    <Shell
      title="Salary"
      eyebrow="Monthly payroll review"
      companyOptions={companies.map((company) => ({ id: company.id, name: company.name }))}
      activeCompanyIds={selectedCompanyIds}
    >
      {flashMessage ? (
        <div
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: flashStatus === "error" ? "rgba(248, 113, 113, 0.45)" : "rgba(16, 185, 129, 0.45)",
            color: flashStatus === "error" ? "#fca5a5" : "#86efac",
          }}
        >
          {flashMessage}
        </div>
      ) : null}

      <GlassPanel>
        <form action="/salary" className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end">
          {selectedCompanyIds.map((companyId) => (
            <input key={companyId} type="hidden" name="companyIds" value={companyId} />
          ))}
          <Field label="Salary month">
            <input name="month" type="month" className={inputClass} defaultValue={selectedMonth} />
          </Field>
          <input type="hidden" name="tab" value={selectedTab} />
          <PendingSubmitButton
            className="btn-outline"
            defaultText="Load month"
            pendingText="Loading..."
          />
        </form>
      </GlassPanel>

      {singleCompanySelected && selectedCompany ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <a href={sheetHref} className={selectedTab === "sheet" ? "gradient-btn" : "btn-outline"}>
              Salary Sheet
            </a>
            <a href={payslipsHref} className={selectedTab === "payslips" ? "gradient-btn" : "btn-outline"}>
              Payslips
            </a>
          </div>
          <div className="flex flex-col gap-1 px-1">
            <h2 className="text-xl font-semibold">
              {selectedCompany.name} - {monthLabel(selectedMonth)}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Review monthly salary values, then save only this month or update employee defaults for future months.
            </p>
          </div>
          {selectedTab === "sheet" ? (
            <SalaryMonthEditor
              companyId={selectedCompanyId}
              month={selectedMonth}
              rows={payrollRows}
              returnTo={returnTo}
            />
          ) : (
            <PayslipEditor
              companyId={selectedCompanyId}
              month={selectedMonth}
              payslips={payslips}
              returnTo={returnTo}
            />
          )}
        </div>
      ) : (
        <GlassPanel>
          <div className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
            {companies.length === 0
              ? "No companies are assigned to this user."
              : "Select one company in the global company scope to review salary for a month."}
          </div>
        </GlassPanel>
      )}
    </Shell>
  );
}
