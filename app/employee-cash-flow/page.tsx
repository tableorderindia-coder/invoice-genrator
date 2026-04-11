import { GlassPanel } from "../_components/glass-panel";
import { inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { Shell } from "../_components/shell";
import {
  saveInvoicePaymentAction,
  saveEmployeeSalaryPaymentAction,
} from "@/src/features/billing/actions";
import {
  getEmployeeCashFlowDashboardData,
  getInvoicePaymentPrefillData,
  listCashFlowInvoiceOptions,
} from "@/src/features/billing/employee-cash-flow-store";
import { listCompanies } from "@/src/features/billing/store";
import type { EmployeeCashFlowMonthRow } from "@/src/features/billing/employee-cash-flow-types";
import { formatInr, formatUsd } from "@/src/features/billing/utils";

import EmployeeCashFlowDetailPanel from "./_components/employee-cash-flow-detail-panel";
import EmployeeCashFlowEntryForm from "./_components/employee-cash-flow-entry-form";
import EmployeeCashFlowSummaryTable from "./_components/employee-cash-flow-summary-table";

export const dynamic = "force-dynamic";

function getTodayMonthParts() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    isoMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    isoDate: now.toISOString().slice(0, 10),
  };
}

export default async function EmployeeCashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    month?: string | string[];
    year?: string | string[];
    invoiceId?: string | string[];
    invoicePaymentId?: string | string[];
    employeeId?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const today = getTodayMonthParts();
  const resolved = await searchParams;
  const companies = await listCompanies();

  const selectedCompanyIdRaw = Array.isArray(resolved.companyId)
    ? resolved.companyId[0]
    : resolved.companyId;
  const selectedCompanyId = selectedCompanyIdRaw || companies[0]?.id || "";

  const selectedMonthRaw = Array.isArray(resolved.month) ? resolved.month[0] : resolved.month;
  const selectedYearRaw = Array.isArray(resolved.year) ? resolved.year[0] : resolved.year;
  const selectedMonth = Number.parseInt(selectedMonthRaw || String(today.month), 10);
  const selectedYear = Number.parseInt(selectedYearRaw || String(today.year), 10);
  const paymentMonth = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const invoiceOptions = selectedCompanyId
    ? await listCashFlowInvoiceOptions({
        companyId: selectedCompanyId,
        month: selectedMonth,
        year: selectedYear,
      })
    : [];

  const selectedInvoiceIdRaw = Array.isArray(resolved.invoiceId)
    ? resolved.invoiceId[0]
    : resolved.invoiceId;
  const selectedInvoiceId = selectedInvoiceIdRaw || invoiceOptions[0]?.id || "";

  const selectedInvoicePaymentIdRaw = Array.isArray(resolved.invoicePaymentId)
    ? resolved.invoicePaymentId[0]
    : resolved.invoicePaymentId;
  const selectedInvoicePaymentId = selectedInvoicePaymentIdRaw || "";

  const dashboardData = selectedCompanyId
    ? await getEmployeeCashFlowDashboardData({
        companyId: selectedCompanyId,
        month: paymentMonth,
      })
    : { rows: [], salaryPayments: [] };

  const prefillData = selectedInvoiceId
    ? await getInvoicePaymentPrefillData({
        invoiceId: selectedInvoiceId,
        paymentMonth,
      })
    : undefined;

  const selectedEmployeeIdRaw = Array.isArray(resolved.employeeId)
    ? resolved.employeeId[0]
    : resolved.employeeId;
  const selectedRow =
    dashboardData.rows.find((row) => row.employeeId === selectedEmployeeIdRaw) ??
    dashboardData.rows[0];
  const selectedSalaryPayment = selectedRow
    ? dashboardData.salaryPayments.find(
        (row) =>
          row.employeeId === selectedRow.employeeId && row.month === selectedRow.paymentMonth,
      )
    : undefined;

  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;

  const returnTo = `/employee-cash-flow?companyId=${encodeURIComponent(selectedCompanyId)}&month=${selectedMonth}&year=${selectedYear}${selectedInvoiceId ? `&invoiceId=${encodeURIComponent(selectedInvoiceId)}` : ""}${selectedEmployeeIdRaw ? `&employeeId=${encodeURIComponent(selectedEmployeeIdRaw)}` : ""}${selectedInvoicePaymentId ? `&invoicePaymentId=${encodeURIComponent(selectedInvoicePaymentId)}` : ""}`;
  const baseQuery = `/employee-cash-flow?companyId=${encodeURIComponent(selectedCompanyId)}&month=${selectedMonth}&year=${selectedYear}${selectedInvoiceId ? `&invoiceId=${encodeURIComponent(selectedInvoiceId)}` : ""}${selectedInvoicePaymentId ? `&invoicePaymentId=${encodeURIComponent(selectedInvoicePaymentId)}` : ""}`;

  return (
    <Shell title="Employee Cash Flow" eyebrow="Cash reality dashboard">
      <GlassPanel gradient>
        <form
          action="/employee-cash-flow"
          className="grid gap-3 md:grid-cols-[1.2fr_140px_140px_1.2fr_auto] md:items-end"
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
          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Month
            </span>
            <input name="month" type="number" min="1" max="12" defaultValue={selectedMonth} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Year
            </span>
            <input name="year" type="number" min="2024" defaultValue={selectedYear} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Cashed-out invoice
            </span>
            <select name="invoiceId" defaultValue={selectedInvoiceId} className={inputClass}>
              {invoiceOptions.length === 0 ? (
                <option value="">No cashed-out invoices for this month</option>
              ) : (
                invoiceOptions.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber}
                  </option>
                ))
              )}
            </select>
          </label>
          <PendingSubmitButton
            className="gradient-btn"
            defaultText="Load month"
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

      <GlassPanel title="Invoice Cash Event" gradient>
        {prefillData ? (
          <form action={saveInvoicePaymentAction} className="grid gap-3 md:grid-cols-5 md:items-end">
            <input type="hidden" name="invoicePaymentId" value={selectedInvoicePaymentId} />
            <input type="hidden" name="invoiceId" value={prefillData.invoice.id} />
            <input type="hidden" name="companyId" value={prefillData.invoice.companyId} />
            <input type="hidden" name="paymentMonth" value={paymentMonth} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Payment month
              </span>
              <input value={paymentMonth} readOnly className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Payment date
              </span>
              <input name="paymentDate" type="date" defaultValue={today.isoDate} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Dollar inward from invoice
              </span>
              <input value={formatUsd(prefillData.invoice.dollarInboundUsdCents)} readOnly className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Cashout USD/INR rate
              </span>
              <input
                name="usdInrRate"
                type="number"
                step="0.0001"
                min="0"
                defaultValue={prefillData.invoice.usdInrRate}
                className={inputClass}
              />
            </label>
            <PendingSubmitButton
              className="btn-outline"
              defaultText="Save payment header"
              pendingText="Saving..."
            />
          </form>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Select a company, month, year, and cashed-out invoice to preload cash flow rows.
          </p>
        )}
      </GlassPanel>

      <GlassPanel title="Editable Cash Flow Rows" gradient>
        {prefillData ? (
          <EmployeeCashFlowEntryForm
            invoicePaymentId={selectedInvoicePaymentId}
            invoiceId={prefillData.invoice.id}
            companyId={prefillData.invoice.companyId}
            paymentMonth={paymentMonth}
            returnTo={returnTo}
            initialEntries={prefillData.entries}
            availableEmployees={prefillData.availableEmployees}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Employee rows will appear here after you load a cashed-out invoice.
          </p>
        )}
      </GlassPanel>

      <GlassPanel title="Monthly Employee Cash View" gradient>
        <EmployeeCashFlowSummaryTable
          rows={dashboardData.rows}
          selectedEmployeeId={selectedEmployeeIdRaw}
          baseQuery={baseQuery}
        />
      </GlassPanel>

      <GlassPanel title="Employee Monthly View" gradient>
        <EmployeeCashFlowDetailPanel row={selectedRow} salaryPayment={selectedSalaryPayment} />
      </GlassPanel>

      {selectedRow ? (
        <GlassPanel title="Quick Salary Snapshot Save">
          <form action={saveEmployeeSalaryPaymentAction} className="grid gap-3 md:grid-cols-6 md:items-end">
            <input type="hidden" name="employeeId" value={selectedRow.employeeId} />
            <input type="hidden" name="companyId" value={selectedRow.companyId} />
            <input type="hidden" name="month" value={selectedRow.paymentMonth} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Employee
              </span>
              <input value={selectedRow.employeeName} readOnly className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Monthly Paid $
              </span>
              <input
                name="salaryUsd"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(selectedRow.monthlyPaidUsdCents / 100).toFixed(2)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Paid USD/INR
              </span>
              <input
                name="paidUsdInrRate"
                type="number"
                step="0.0001"
                min="0"
                defaultValue={selectedRow.paidUsdInrRate}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Paid date
              </span>
              <input name="paidDate" type="date" defaultValue={today.isoDate} className={inputClass} />
            </label>
            <label className="inline-flex items-center gap-2">
              <input name="paidStatus" type="checkbox" value="true" defaultChecked />
              <span style={{ color: "var(--text-secondary)" }}>Paid this month</span>
            </label>
            <PendingSubmitButton
              className="btn-outline"
              defaultText="Save salary snapshot"
              pendingText="Saving..."
            />
          </form>
          <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
            Current row cash in: {formatInr(selectedRow.cashInInrCents)}. Current salary paid snapshot: {formatInr(selectedRow.salaryPaidInrCents)}.
          </p>
        </GlassPanel>
      ) : null}
    </Shell>
  );
}
