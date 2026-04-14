import { Shell } from "../_components/shell";
import { GlassPanel } from "../_components/glass-panel";
import { Field, inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import {
  saveCompanyExpenseAction,
  deleteCompanyExpenseAction,
} from "@/src/features/billing/actions";
import { listCompanies, listCompanyExpenses } from "@/src/features/billing/store";
import { formatInr, formatMonthYear } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const companies = await listCompanies();

  const selectedCompanyId = typeof params.companyId === "string" ? params.companyId : companies[0]?.id ?? "";
  const now = new Date();
  const selectedYear = typeof params.year === "string" ? Number.parseInt(params.year, 10) : now.getFullYear();
  const selectedMonth = typeof params.month === "string" ? Number.parseInt(params.month, 10) : (now.getMonth() + 1);

  const flashStatus = typeof params.flashStatus === "string" ? params.flashStatus : undefined;
  const flashMessage = typeof params.flashMessage === "string" ? params.flashMessage : undefined;

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const expenses = selectedCompanyId
    ? await listCompanyExpenses({
        companyId: selectedCompanyId,
        year: selectedYear,
        month: selectedMonth,
      })
    : [];

  const totalInrCents = expenses.reduce((sum, e) => sum + e.amountInrCents, 0);

  // Build return URL with current filters
  const returnUrl = `/expenses?companyId=${encodeURIComponent(selectedCompanyId)}&year=${selectedYear}&month=${selectedMonth}`;

  // Years dropdown range
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <Shell title="Company Expenses" eyebrow="Financial management">
      {/* Flash message */}
      {flashStatus && flashMessage && (
        <div
          className="glass-card px-4 py-3 text-sm font-medium"
          style={{
            color: flashStatus === "error" ? "#fca5a5" : "#6ee7b7",
            borderLeft: `3px solid ${flashStatus === "error" ? "#ef4444" : "#10b981"}`,
          }}
        >
          {flashMessage}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Left: Filters + Add form */}
        <div className="flex flex-col gap-6">
          {/* Period selector */}
          <GlassPanel gradient>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Select Period
            </h2>
            <form className="mt-4 flex flex-wrap gap-3 items-end">
              <Field label="Company">
                <select
                  name="companyId"
                  defaultValue={selectedCompanyId}
                  className={inputClass}
                  style={{ minWidth: 160 }}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Month">
                <select name="month" defaultValue={selectedMonth} className={inputClass}>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Year">
                <select name="year" defaultValue={selectedYear} className={inputClass}>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </Field>
              <button
                type="submit"
                className="gradient-btn"
                style={{ height: "fit-content" }}
              >
                Load
              </button>
            </form>
          </GlassPanel>

          {/* Add expense form */}
          <GlassPanel gradient>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Add Expense
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {selectedCompany?.name ?? "—"} · {formatMonthYear(selectedMonth, selectedYear)}
            </p>
            <form action={saveCompanyExpenseAction} className="mt-4 space-y-4">
              <input type="hidden" name="companyId" value={selectedCompanyId} />
              <input type="hidden" name="year" value={selectedYear} />
              <input type="hidden" name="month" value={selectedMonth} />
              <input type="hidden" name="returnTo" value={returnUrl} />

              <Field label="Label">
                <input
                  name="label"
                  required
                  className={inputClass}
                  placeholder="e.g. Office rent, Software licenses"
                />
              </Field>
              <Field label="Amount (INR)">
                <input
                  name="amountInr"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className={inputClass}
                  placeholder="0.00"
                />
              </Field>
              <PendingSubmitButton
                className="gradient-btn"
                defaultText="Add expense"
                pendingText="Saving..."
              />
            </form>
          </GlassPanel>
        </div>

        {/* Right: Existing expenses */}
        <GlassPanel gradient>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Expenses for {formatMonthYear(selectedMonth, selectedYear)}
              </h2>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {selectedCompany?.name ?? "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Total
              </p>
              <p className="text-lg font-bold" style={{ color: totalInrCents > 0 ? "#fca5a5" : "var(--text-primary)" }}>
                {formatInr(totalInrCents)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {expenses.length === 0 && (
              <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                No expenses recorded for this period yet.
              </p>
            )}

            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="glass-card p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {expense.label || "(No label)"}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {formatInr(expense.amountInrCents)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Edit form — inline amount update */}
                  <form action={saveCompanyExpenseAction} className="flex items-center gap-2">
                    <input type="hidden" name="expenseId" value={expense.id} />
                    <input type="hidden" name="companyId" value={selectedCompanyId} />
                    <input type="hidden" name="year" value={selectedYear} />
                    <input type="hidden" name="month" value={selectedMonth} />
                    <input type="hidden" name="label" value={expense.label} />
                    <input type="hidden" name="returnTo" value={returnUrl} />
                    <input
                      name="amountInr"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(expense.amountInrCents / 100).toFixed(2)}
                      className={inputClass}
                      style={{ width: 100 }}
                    />
                    <PendingSubmitButton
                      className="gradient-btn text-xs px-2 py-1"
                      defaultText="Save"
                      pendingText="..."
                    />
                  </form>
                  {/* Delete */}
                  <form action={deleteCompanyExpenseAction}>
                    <input type="hidden" name="expenseId" value={expense.id} />
                    <input type="hidden" name="returnTo" value={returnUrl} />
                    <button
                      type="submit"
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
                      style={{ color: "#fca5a5" }}
                      title="Delete expense"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>
    </Shell>
  );
}
