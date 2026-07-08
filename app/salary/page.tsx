import { GlassPanel } from "@/app/_components/glass-panel";
import { Field, inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { Shell } from "@/app/_components/shell";
import { canAccessCompany } from "@/lib/auth/authorization";
import { requirePageAccess } from "@/lib/auth/server";
import { listMonthlyPayrollRows } from "@/src/features/billing/payroll-store";
import { listCompanies } from "@/src/features/billing/store";
import { formatMonthYear } from "@/src/features/billing/utils";
import { SalaryMonthEditor } from "./_components/salary-month-editor";

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
    month?: SearchValue;
    flashStatus?: SearchValue;
    flashMessage?: SearchValue;
  }>;
}) {
  const context = await requirePageAccess("salary");
  const resolved = await searchParams;
  const allCompanies = await listCompanies();
  const companies = allCompanies.filter((company) =>
    canAccessCompany({
      role: context.profile.role,
      companyId: company.id,
      companyAccess: context.companyAccess,
    }),
  );

  const selectedCompanyIdRaw = firstSearchValue(resolved.companyId);
  const selectedCompany =
    companies.find((company) => company.id === selectedCompanyIdRaw) ?? companies[0];
  const selectedCompanyId = selectedCompany?.id ?? "";
  const selectedMonth = firstSearchValue(resolved.month) || currentMonthKey();
  const flashStatus = firstSearchValue(resolved.flashStatus);
  const flashMessage = firstSearchValue(resolved.flashMessage);
  const returnTo = `/salary?companyId=${encodeURIComponent(selectedCompanyId)}&month=${encodeURIComponent(selectedMonth)}`;
  const payrollRows = selectedCompanyId
    ? await listMonthlyPayrollRows({ companyId: selectedCompanyId, month: selectedMonth })
    : [];

  return (
    <Shell
      title="Salary"
      eyebrow="Monthly payroll review"
      companyOptions={companies.map((company) => ({ id: company.id, name: company.name }))}
      activeCompanyId={selectedCompanyId}
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
        <form action="/salary" className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Company">
            <select name="companyId" className={inputClass} defaultValue={selectedCompanyId}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Salary month">
            <input name="month" type="month" className={inputClass} defaultValue={selectedMonth} />
          </Field>
          <PendingSubmitButton
            className="btn-outline"
            defaultText="Load month"
            pendingText="Loading..."
          />
        </form>
      </GlassPanel>

      {selectedCompany ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-1 px-1">
            <h2 className="text-xl font-semibold">
              {selectedCompany.name} - {monthLabel(selectedMonth)}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Review monthly salary values, then save only this month or update employee defaults for future months.
            </p>
          </div>
          <SalaryMonthEditor
            companyId={selectedCompanyId}
            month={selectedMonth}
            rows={payrollRows}
            returnTo={returnTo}
          />
        </div>
      ) : (
        <GlassPanel>
          <div className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
            No companies are assigned to this user.
          </div>
        </GlassPanel>
      )}
    </Shell>
  );
}
